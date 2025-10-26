import spacy
import firebase_admin
from firebase_admin import credentials, firestore

# ====== FIREBASE SETUP ======
cred = credentials.Certificate("poetry-game/database_stuff/poetry-game-3c18d-firebase-adminsdk-fbsvc-f4bbff85b5.json")  # path to your Firebase key
firebase_admin.initialize_app(cred)
db = firestore.client()

# ====== SPACY SETUP ======
nlp = spacy.load("en_core_web_sm")

# ====== FILE SETUP ======
INPUT_FILE = "poetry-game/database_stuff/words.txt"

# ====== READ WORDS ======
with open(INPUT_FILE, "r", encoding="utf-8") as f:
    words = [line.strip() for line in f if line.strip()]

# ====== CATEGORIZE ======
nouns, verbs, adjectives = [], [], []

for doc in nlp.pipe(words, batch_size=1000):
    token = doc[0]
    if token.pos_ == "NOUN":
        nouns.append(token.text)
    elif token.pos_ == "VERB":
        verbs.append(token.text)
    elif token.pos_ == "ADJ":
        adjectives.append(token.text)

print(f"Categorized ✅  Nouns: {len(nouns)}, Verbs: {len(verbs)}, Adjectives: {len(adjectives)}")

# ====== UPLOAD TO FIRESTORE ======
data = {
    "nouns": nouns,
    "verbs": verbs,
    "adjectives": adjectives
}
db.collection("wordCategories").document("categorizedWords").set(data)

print("✅ Uploaded categorized words to Firebase Firestore!")
