import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import sqlite3
import numpy as np
from sqlalchemy import create_engine, Column, Integer, Float, LargeBinary, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

Base = declarative_base()

class VoteMatrix(Base):
    __tablename__ = 'vote_matrices'

    id = Column(Integer, primary_key=True)
    participants = Column(Integer)
    comments = Column(Integer)
    agree_percentage = Column(Float)
    disagree_percentage = Column(Float)
    consensus_groups = Column(Integer)
    group_sizes = Column(String)
    group_similarity = Column(Float)
    matrix_data = Column(LargeBinary)

    def get_matrix(self):
        unpacked = np.frombuffer(self.matrix_data, dtype=np.uint8)
        total_elements = self.participants * self.comments
        if len(unpacked) == total_elements:
            # Data was stored without compression
            return unpacked.reshape(self.participants, self.comments) - 1
        else:
            # Data was stored with compression
            bits = np.unpackbits(unpacked)
            if len(bits) >= total_elements:
                return bits[:total_elements].reshape(self.participants, self.comments) - 1
            else:
                raise ValueError(f"Stored data size ({len(bits)}) is smaller than expected size ({total_elements})")

engine = create_engine('sqlite:///../data/vote_matrices.db')
Base.metadata.create_all(engine)
Session = sessionmaker(bind=engine)

def store_matrix(params, matrix):
    session = Session()
    compressed_matrix = np.packbits(matrix + 1).tobytes()
    vote_matrix = VoteMatrix(
        participants=params['participants'],
        comments=params['comments'],
        agree_percentage=params['agree_percentage'],
        disagree_percentage=params['disagree_percentage'],
        consensus_groups=params['consensus_groups'],
        group_sizes=str(params['group_sizes']),
        group_similarity=params['group_similarity'],
        matrix_data=compressed_matrix
    )
    session.add(vote_matrix)
    session.commit()
    session.close()

def get_matrices(criteria=None):
    session = Session()
    query = session.query(VoteMatrix)
    if criteria:
        for key, value in criteria.items():
            if isinstance(value, dict):
                for op, val in value.items():
                    if op == '>=':
                        query = query.filter(getattr(VoteMatrix, key) >= val)
                    elif op == '<=':
                        query = query.filter(getattr(VoteMatrix, key) <= val)
            else:
                query = query.filter(getattr(VoteMatrix, key) == value)
    results = query.all()
    session.close()
    return [(result, result.get_matrix()) for result in results]