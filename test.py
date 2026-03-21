from backend.database import SessionLocal
from backend import models

db = SessionLocal()
room = db.query(models.Room).filter(models.Room.id == 1).first()
print("subtipo:", room.subtipo)
print("type:", room.type)
print("number:", room.number)
db.close()