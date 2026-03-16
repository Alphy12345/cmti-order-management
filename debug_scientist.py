import urllib.request
import urllib.parse
import json
from db import SessionLocal
from models.user_model import User
from sqlalchemy import func

db = SessionLocal()
try:
    scientists = db.query(User).filter(func.lower(User.role) == 'scientist').limit(5).all()
    print("Found scientists:", [s.name for s in scientists])

    if scientists:
        s_name = scientists[0].name
        print(f"\nTesting API for scientist: '{s_name}'")
        
        url = f"http://localhost:8000/proposals/by-name/{urllib.parse.quote(s_name)}"
        resp = urllib.request.urlopen(url)
        data = json.loads(resp.read())
        print(f"Got {len(data)} proposals")
        for p in data[:5]:
            print(f"  ID={p['id']}, Coord='{p.get('project_co_ordinator')}', Quot='{p.get('quotation_given_by_name')}'")
    else:
        # User in the image was 'shashank'. Let's check his role
        user = db.query(User).filter(func.lower(User.name) == 'shashank').first()
        if user:
            print(f"User shashank exists, Role is '{user.role}'")
            print(f"\nTesting API for user: 'shashank'")
            
            url = f"http://localhost:8000/proposals/by-name/{urllib.parse.quote(user.name)}"
            resp = urllib.request.urlopen(url)
            data = json.loads(resp.read())
            print(f"Got {len(data)} proposals")
            for p in data[:5]:
                print(f"  ID={p['id']}, Coord='{p.get('project_co_ordinator')}', Quot='{p.get('quotation_given_by_name')}'")

except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
