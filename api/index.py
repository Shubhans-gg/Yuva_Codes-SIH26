import os
import sys

# Ensure root workspace directory is in Python path for Vercel Serverless
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app
