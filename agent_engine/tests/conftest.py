import os
import sys
from pathlib import Path

os.environ.setdefault("ENGINE_SERVICE_TOKEN", "test-service-token")
os.environ.setdefault("KEYCLOAK_ISSUER_URL", "http://issuer.test/realms/bank-ai")
os.environ.setdefault("OIDC_EXPECTED_AUDIENCE", "bank-ai-api")
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
