import unittest

try:
    from danger.modules.merge_ops import merge_country_danger_payloads
except ModuleNotFoundError:
    from modules.merge_ops import merge_country_danger_payloads


class MergeCountryDangerPayloadsNoiseFilterTest(unittest.TestCase):
    def test_filters_ukraine_border_noise_sentence(self):
        base_items = {
            "RU": [
                {
                    "id": "77",
                    "country_name": "러시아",
                    "country_en_name": "Russia",
                }
            ]
        }
        special_items = {
            "RU": [
                {
                    "country_nm": "러시아",
                    "country_eng_nm": "Russia",
                    "forbidden_region_ty": (
                        "우크라이나 접경지역(쿠르스크주 전체 및 로스토프&middot;벨고로드&middot;보로네시"
                        "&middot;브랸스크 지역 내 우크라이나 국경에서 30km 구간) , 2&middot;3단계 및 "
                        "특별여행주의보 발령 지역을 제외한 지역."
                    ),
                }
            ]
        }

        rows = merge_country_danger_payloads(base_items, special_items)

        self.assertEqual(1, len(rows))
        self.assertIsNone(rows[0]["forbidden__region_ty"])

    def test_decodes_html_entity_in_normal_text(self):
        base_items = {
            "JP": [
                {
                    "id": "81",
                    "country_name": "일본",
                    "country_en_name": "Japan",
                    "attention_partial": "2&middot;3단계",
                }
            ]
        }

        rows = merge_country_danger_payloads(base_items, {})

        self.assertEqual("2·3단계", rows[0]["attention_partial"])

    def test_filters_short_ukraine_border_noise_sentence(self):
        base_items = {
            "RU": [
                {
                    "id": "99",
                    "country_name": "러시아",
                    "country_en_name": "Russia",
                }
            ]
        }
        special_items = {
            "RU": [
                {
                    "country_nm": "러시아",
                    "country_eng_nm": "Russia",
                    "forbidden_region_ty": (
                        "우크라이나 접경지역(쿠르스크주 전체 및 로스토프&middot;벨고로드&middot;보로네시"
                        "&middot;브랸스크 지역 내 우크라이나 국경에서 30km 구간)"
                    ),
                }
            ]
        }

        rows = merge_country_danger_payloads(base_items, special_items)

        self.assertIsNone(rows[0]["forbidden__region_ty"])


if __name__ == "__main__":
    unittest.main()
