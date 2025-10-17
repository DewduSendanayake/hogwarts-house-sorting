from flask import Flask, render_template, request, jsonify
import random

app = Flask(__name__, static_folder="static", template_folder="templates")

# Simple mapping of answer weights to houses
HOUSE_KEYS = ["Gryffindor", "Hufflepuff", "Ravenclaw", "Slytherin"]

# A simple quiz with 5 questions, each answer maps to a weighting across houses.
QUIZ = [
    {
        "q": "What's more important to you?",
        "options": {
            "Bravery and daring": {"Gryffindor": 2},
            "Loyalty and hard work": {"Hufflepuff": 2},
            "Learning and wisdom": {"Ravenclaw": 2},
            "Ambition and cunning": {"Slytherin": 2}
        }
    },
    {
        "q": "Pick a magical pet:",
        "options": {
            "Phoenix": {"Gryffindor": 2},
            "Badger": {"Hufflepuff": 2},
            "Owl": {"Ravenclaw": 2},
            "Snake": {"Slytherin": 2}
        }
    },
    {
        "q": "At a party you are:",
        "options": {
            "Standing up for others": {"Gryffindor": 2},
            "Helping the host and chatting with everyone": {"Hufflepuff": 2},
            "Discussing ideas in a small group": {"Ravenclaw": 2},
            "Making connections and securing a future advantage": {"Slytherin": 2}
        }
    },
    {
        "q": "Pick a color:",
        "options": {
            "Scarlet": {"Gryffindor": 1},
            "Yellow": {"Hufflepuff": 1},
            "Blue": {"Ravenclaw": 1},
            "Green": {"Slytherin": 1}
        }
    },
    {
        "q": "You value:",
        "options": {
            "Courage": {"Gryffindor": 2},
            "Patience": {"Hufflepuff": 2},
            "Curiosity": {"Ravenclaw": 2},
            "Resourcefulness": {"Slytherin": 2}
        }
    }
]

def compute_house(answers):
    # answers is a list of chosen option strings, length == len(QUIZ)
    scores = {h: 0 for h in HOUSE_KEYS}
    for ans, q in zip(answers, QUIZ):
        mapping = q["options"].get(ans)
        if not mapping:
            # Unknown answer — ignore
            continue
        for house, pts in mapping.items():
            scores[house] = scores.get(house, 0) + pts
    # find max score(s)
    max_score = max(scores.values())
    top = [h for h, s in scores.items() if s == max_score]
    # tie-breaker: random choice among top
    return random.choice(top), scores

@app.route("/")
def index():
    # send quiz to frontend
    # we pass simplified structure: list of {q, options: [opt1, opt2...]}
    simple_quiz = []
    for q in QUIZ:
        simple_quiz.append({
            "q": q["q"],
            "options": list(q["options"].keys())
        })
    return render_template("index.html", quiz=simple_quiz)

@app.route("/api/sort", methods=["POST"])
def sort_api():
    data = request.get_json()
    answers = data.get("answers", [])
    if not isinstance(answers, list) or len(answers) != len(QUIZ):
        return jsonify({"error": "answers must be a list with length {}".format(len(QUIZ))}), 400
    house, scores = compute_house(answers)
    return jsonify({"house": house, "scores": scores})

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
