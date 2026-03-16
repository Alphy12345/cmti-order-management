from db import SessionLocal
from models.user_model import User
from models.model import Proposal
from sqlalchemy import func

db = SessionLocal()
try:
    print("Finding any proposals with 'shashank' in coordinator...")
    shashank_props = db.query(Proposal).filter(func.lower(Proposal.project_co_ordinator).contains('shashank')).all()
    print(f"Total proposals with 'shashank' in coordinator: {len(shashank_props)}")
    for p in shashank_props:
        print(f"  ID: {p.id}, Coord: {p.project_co_ordinator}")

    print("\nLet's check all unique coordinators in the DB:")
    coords = db.query(Proposal.project_co_ordinator).distinct().all()
    print("Sample coordinators:", [c[0] for c in coords if c[0]][:20])

except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
