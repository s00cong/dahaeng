import json

with open('c:/Users/SSAFY/Desktop/soob/S14P21D206/backend/erd.json', 'r', encoding='utf-8') as f:
    erd = json.load(f)

for table in erd.get('entityData', []):
    name = table.get('name', '')
    pname = table.get('pName', '')
    is_target_table = 'city' in str(name).lower() or 'city' in str(pname).lower() or 'flight' in str(name).lower() or 'flight' in str(pname).lower()
    
    if is_target_table:
        print('=============================')
        print(f'Table: {name} / {pname}')
        for field in table.get('fields', []):
            print(f'  - {field.get("name")} / {field.get("pName")} : {field.get("type")}')
    else:
        for field in table.get('fields', []):
            if 'city' in str(field.get('name')).lower() or 'city' in str(field.get('pName')).lower():
                print(f'Table {name} / {pname} has city field: {field.get("name")} / {field.get("pName")} : {field.get("type")}')
