
from sqlalchemy import text

from database import Base, engine
import models


def initialize_database():
    print("Connecting to PostgreSQL...")

    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))

    print("PostgreSQL connection successful!")

    Base.metadata.create_all(bind=engine)

    print("Database tables created successfully!")


if __name__ == "__main__":
    initialize_database()
