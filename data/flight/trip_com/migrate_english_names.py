import os
import json
import glob
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
FLIGHT_ROOT = BASE_DIR.parent

# Load English mapping
eng_mapping_file = BASE_DIR / "en_city_airport_mapping.json"
with eng_mapping_file.open('r', encoding='utf-8') as f:
    en_mapping = json.load(f)

# Create a reverse mapping for quick lookup: airport_code -> (country_en, city_en)
airport_to_en = {}
for country, cities in en_mapping.items():
    for city, airports in cities.items():
        for airport in airports:
            # Taking the first city match for an airport if there are duplicates
            if airport not in airport_to_en:
                airport_to_en[airport] = (country, city)

def process_bronze_file(file_path):
    updated = False
    new_lines = []
    
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    for line in lines:
        if not line.strip():
            continue
            
        try:
            data = json.loads(line)
            # Both Trip.com and Google Flights have the entity block
            entity = data.get('entity', {})
            
            # Use 'dest_airport' for Google Flights/Trip.com or 'origin' depending on direction if needed
            # Assuming 'dest_airport' is the best indicator of the target city/country for mapping
            airport_code = entity.get('dest_airport')
            
            if airport_code and airport_code in airport_to_en:
                country_en, city_en = airport_to_en[airport_code]
                
                # Update the entity with English names
                if entity.get('city_name_en') != city_en or entity.get('country_en') != country_en:
                    entity['city_name_en'] = city_en
                    entity['country_en'] = country_en
                    
                    # Optionally, replace city_name_kr and city_code entirely if preferred by user
                    # But adding _en for now is safer, we can ask user if they want to override the original ones.
                    
                    data['entity'] = entity
                    updated = True
            
            new_lines.append(json.dumps(data, ensure_ascii=False))
        except Exception as e:
            print(f"Error parsing line in {file_path}: {e}")
            new_lines.append(line.strip())
            
    if updated:
        with open(file_path, 'w', encoding='utf-8') as f:
            for nl in new_lines:
                f.write(nl + '\n')
        return True
    return False

def main():
    # Base directories to search for bronze_airticket folders
    base_dirs = [
        BASE_DIR / "bronze_airticket",
        FLIGHT_ROOT / "google_flight" / "bronze_airticket",
    ]
    
    total_files_processed = 0
    total_files_updated = 0
    
    for base_dir in base_dirs:
        if not base_dir.exists():
            continue
            
        jsonl_files = glob.glob(os.path.join(str(base_dir), '**', '*.jsonl'), recursive=True)
        for j_file in jsonl_files:
            total_files_processed += 1
            if process_bronze_file(j_file):
                total_files_updated += 1
                
    print(f"Processed {total_files_processed} files.")
    print(f"Updated {total_files_updated} files with English names.")

if __name__ == '__main__':
    main()
