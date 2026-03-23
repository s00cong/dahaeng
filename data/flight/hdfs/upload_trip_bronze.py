from __future__ import annotations

import argparse
import os
from pathlib import Path
from urllib.parse import urlencode
import requests


def parse_args():
    parser = argparse.ArgumentParser(description="Upload Trip.com bronze partitions to HDFS")
    parser.add_argument("--local-bronze-root", required=True)
    parser.add_argument("--hdfs-root", required=True)
    parser.add_argument("--hdfs-uri", required=True)
    parser.add_argument("--date")
    parser.add_argument("--hour")
    parser.add_argument(
        "--webhdfs-user",
        default=os.getenv("HDFS_WEBHDFS_USER", "root"),
        help="WebHDFS user.name query parameter (default: root).",
    )
    parser.add_argument(
        "--datanode-host",
        default="datanode",
        help="DataNode Docker container hostname (default: datanode). Used to fix WebHDFS 127.0.0.1 redirect.",
    )
    return parser.parse_args()


def build_webhdfs_endpoint(hdfs_uri: str) -> str:
    normalized = hdfs_uri.removeprefix("hdfs://").rstrip("/")
    host = normalized.split(":", 1)[0]
    return f"http://{host}:9870/webhdfs/v1"


def build_hdfs_target_directory(local_partition_dir: Path, hdfs_root: str) -> str:
    dt_dir = local_partition_dir.parent.name
    hour_dir = local_partition_dir.name
    return f"{hdfs_root.rstrip('/')}/{dt_dir}/{hour_dir}"


def find_latest_partition_dir(local_bronze_root: Path) -> Path:
    candidates = sorted(local_bronze_root.glob("dt=*/hour=*"))
    if not candidates:
        raise FileNotFoundError(f"No Trip.com bronze partitions found under {local_bronze_root}")
    return candidates[-1]


def resolve_partition_dir(local_bronze_root: Path, date: str | None, hour: str | None) -> Path:
    if date and hour:
        return local_bronze_root / f"dt={date}" / f"hour={hour}"
    if date:
        hour_dirs = sorted((local_bronze_root / f"dt={date}").glob("hour=*"))
        if not hour_dirs:
            raise FileNotFoundError(f"No hour partitions found for dt={date}")
        return hour_dirs[-1]
    return find_latest_partition_dir(local_bronze_root)


def webhdfs_url(base_endpoint: str, hdfs_path: str, params: dict[str, str]) -> str:
    query = urlencode(params)
    return f"{base_endpoint}{hdfs_path}?{query}"


def ensure_hdfs_directory(base_endpoint: str, hdfs_path: str, webhdfs_user: str) -> None:
    response = requests.put(
        webhdfs_url(
            base_endpoint,
            hdfs_path,
            {"op": "MKDIRS", "user.name": webhdfs_user},
        ),
        timeout=30,
    )
    response.raise_for_status()


def upload_file(
    base_endpoint: str,
    local_file: Path,
    hdfs_file_path: str,
    webhdfs_user: str,
    datanode_host: str | None = None,
) -> None:
    create_response = requests.put(
        webhdfs_url(
            base_endpoint,
            hdfs_file_path,
            {"op": "CREATE", "overwrite": "true", "user.name": webhdfs_user},
        ),
        allow_redirects=False,
        timeout=30,
    )
    if create_response.status_code not in (307, 201):
        create_response.raise_for_status()

    upload_url = create_response.headers.get("Location")
    if upload_url:
        # WebHDFS redirect sometimes returns 127.0.0.1 which is unreachable from Docker.
        # Replace it with the actual DataNode hostname so Docker containers can reach it.
        if datanode_host:
            upload_url = upload_url.replace("127.0.0.1", datanode_host)
        with local_file.open("rb") as handle:
            upload_response = requests.put(upload_url, data=handle, timeout=120)
        upload_response.raise_for_status()
        return

    # Fallback for installations that complete create in one step.
    if create_response.status_code == 201:
        return
    raise RuntimeError(f"Unexpected WebHDFS response while uploading {local_file}")


def upload_partition_to_hdfs(
    local_partition_dir: Path,
    hdfs_target: str,
    hdfs_uri: str,
    webhdfs_user: str,
    datanode_host: str = "datanode",
) -> None:
    base_endpoint = build_webhdfs_endpoint(hdfs_uri)
    ensure_hdfs_directory(base_endpoint, hdfs_target, webhdfs_user)

    for local_file in sorted(local_partition_dir.iterdir()):
        if local_file.is_file():
            upload_file(
                base_endpoint,
                local_file,
                f"{hdfs_target.rstrip('/')}/{local_file.name}",
                webhdfs_user,
                datanode_host=datanode_host,
            )


def main() -> None:
    args = parse_args()
    local_bronze_root = Path(args.local_bronze_root)
    partition_dir = resolve_partition_dir(local_bronze_root, args.date, args.hour)
    if not partition_dir.exists():
        raise FileNotFoundError(f"Trip.com bronze partition does not exist: {partition_dir}")

    hdfs_target = build_hdfs_target_directory(partition_dir, args.hdfs_root)
    upload_partition_to_hdfs(
        partition_dir,
        hdfs_target,
        args.hdfs_uri,
        args.webhdfs_user,
        datanode_host=args.datanode_host,
    )

    print(f"[DONE] Uploaded {partition_dir} -> {hdfs_target} via {args.hdfs_uri}")


if __name__ == "__main__":
    main()
