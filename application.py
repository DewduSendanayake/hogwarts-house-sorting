from flask import Flask, render_template, request, jsonify
import random

app = Flask(__name__, static_folder="static", template_folder="templates")

# --- Canon-safe keys ---
HOUSE_KEYS = ["Gryffindor", "Hufflepuff", "Ravenclaw", "Slytherin"]

# --- QUIZ PARTS: modular parts that user can pick in any order ---
# Each part contains a name and questions. Each question maps option -> scoring dict.
QUIZ_PARTS = {
    "house": {
        "name": "House sorting",
        "desc": "Find your Hogwarts house by values and instinct.",
        "questions": [
            {
                "q": "What's more important to you?",
                "options": {
                    "Bravery and daring": {"Gryffindor": 2},
                    "Loyalty and hard work": {"Hufflepuff": 2},
                    "Learning and wisdom": {"Ravenclaw": 2},
                    "Ambition and cunning": {"Slytherin": 2},
                },
            },
            {
                "q": "Pick a magical pet:",
                "options": {
                    "Phoenix": {"Gryffindor": 2},
                    "Badger": {"Hufflepuff": 2},
                    "Owl": {"Ravenclaw": 2},
                    "Snake": {"Slytherin": 2},
                },
            },
            {
                "q": "At a party you are:",
                "options": {
                    "Standing up for others": {"Gryffindor": 2},
                    "Helping the host and chatting with everyone": {"Hufflepuff": 2},
                    "Discussing ideas in a small group": {"Ravenclaw": 2},
                    "Making connections and securing a future advantage": {"Slytherin": 2},
                },
            },
            {
                "q": "Pick a color:",
                "options": {
                    "Scarlet": {"Gryffindor": 1},
                    "Yellow": {"Hufflepuff": 1},
                    "Blue": {"Ravenclaw": 1},
                    "Green": {"Slytherin": 1},
                },
            },
            {
                "q": "You value:",
                "options": {
                    "Courage": {"Gryffindor": 2},
                    "Patience": {"Hufflepuff": 2},
                    "Curiosity": {"Ravenclaw": 2},
                    "Resourcefulness": {"Slytherin": 2},
                },
            },
            {
                "q": "When faced with a difficult choice, you:",
                "options": {
                    "Act boldly without hesitation": {"Gryffindor": 2},
                    "Consider the feelings of others": {"Hufflepuff": 2},
                    "Analyze every possible outcome": {"Ravenclaw": 2},
                    "Choose the option that benefits you most": {"Slytherin": 2},
                },
            },
        ],
    },
    "patronus": {
        "name": "Patronus",
        "desc": "Which Patronus might you conjure?",
        "questions": [
            {
                "q": "What calms you in dark times?",
                "options": {
                    "Memories of loved ones": {"Doe": 2, "Stag": 1},
                    "Quiet by a river": {"Otter": 2},
                    "Running free": {"Hare": 2, "Stag": 1},
                    "Curling up with a book": {"Cat": 2},
                },
            },
            {
                "q": "Pick a place at Hogwarts:",
                "options": {
                    "The Forbidden Forest (carefully)": {"Stag": 2, "Fox": 1},
                    "By the Black Lake": {"Otter": 2},
                    "The Astronomy Tower": {"Hare": 1, "Stag": 1},
                    "The Gryffindor Common Room": {"Dog": 1},
                },
            },
            {
                "q": "Your happiest memory is:",
                "options": {
                    "A family moment": {"Doe": 2},
                    "A clever discovery": {"Otter": 1, "Cat": 1},
                    "A day outdoors running/flying": {"Stag": 2, "Hare": 1},
                    "An unexpected rescue or courage": {"Stag": 1, "Dog": 1},
                },
            },
        ],
    },
    "wand": {
        "name": "Wand finder",
        "desc": "Get a book-respecting style of wand (wood/core/theme).",
        "questions": [
            {
                "q": "Which quality matters most in a wand?",
                "options": {
                    "Loyalty to its owner": {"Holly|Phoenix": 1, "Yew|Phoenix": 2},
                    "Power and longevity": {"Yew|Phoenix": 2, "Oak|Dragon": 1},
                    "Versatility": {"Elm|Unicorn": 2, "Ash|Unicorn": 1},
                    "Subtlety and connection": {"Willow|Unicorn": 1, "Vine|Dragon": 1},
                },
            },
            {
                "q": "Choose a material vibe:",
                "options": {
                    "Strong, dark wood (yew/ebony)": {"Yew|Phoenix": 2, "Ebony|Dragon": 1},
                    "Light, noble wood (holly/ash)": {"Holly|Phoenix": 2, "Ash|Unicorn": 1},
                    "Ancient and wise (oak)": {"Oak|Dragon": 2},
                    "Quick and clever (willow/vine)": {"Willow|Unicorn": 1, "Vine|Dragon": 1},
                },
            },
        ],
    },
    "bestie": {
        "name": "Hogwarts bestie",
        "desc": "Which character would be your closest friend?",
        "questions": [
            {
                "q": "You value a friend who:",
                "options": {
                    "Is fiercely loyal and funny": {"Ron": 2},
                    "Is studious and reliable": {"Hermione": 2},
                    "Is eccentric and supportive": {"Luna": 2},
                    "Is brave and protective": {"Neville": 1, "Harry": 1},
                },
            },
            {
                "q": "In downtime at Hogwarts you:",
                "options": {
                    "Play chess or socialize loudly": {"Ron": 2},
                    "Study in the library": {"Hermione": 2},
                    "Explore quirks and talk about creatures": {"Luna": 2},
                    "Tend to plants or practice spells": {"Neville": 2},
                },
            },
        ],
    },
    "enemy": {
        "name": "Rival",
        "desc": "Who would be your rival or frequent foil?",
        "questions": [
            {
                "q": "If you are outspoken and honest, who would clash with you?",
                "options": {
                    "Someone who values status and lineage": {"Draco": 2},
                    "An overbearing bureaucrat": {"Umbridge": 2},
                    "Someone competitive but principled": {"Pansy": 1, "Blaise": 1},
                    "A secretive schemer": {"Crabbe": 1, "Goyle": 1},
                },
            },
            {
                "q": "Which behavior annoys you most?",
                "options": {
                    "Cruelty or bullying": {"Draco": 2},
                    "Arrogant rule-following": {"Umbridge": 2},
                    "Backstabbing": {"Draco": 1, "Blaise": 1},
                    "Dismissiveness of others": {"Pansy": 1},
                },
            },
        ],
    },
    "skills": {
        "name": "Magical skill focus",
        "desc": "Which magical branch would you naturally excel at?",
        "questions": [
            {
                "q": "What appeals to you in magic?",
                "options": {
                    "Creating and performing charms": {"Charms": 2},
                    "Understanding potions and mixtures": {"Potions": 2},
                    "Study of creatures and care": {"Care of Magical Creatures": 2},
                    "Strategy and cunning spells": {"Defense": 1, "Transfiguration": 1},
                },
            },
            {
                "q": "In class you prefer:",
                "options": {
                    "Precise, practiced technique": {"Charms": 1, "Transfiguration": 1},
                    "Experimenting carefully": {"Potions": 2},
                    "Hands-on outside learning": {"Care of Magical Creatures": 2},
                    "Tactical thinking": {"Defense": 2},
                },
            },
        ],
    },
    "quidditch": {
        "name": "Quidditch role",
        "desc": "What Quidditch role fits you best?",
        "questions": [
            {
                "q": "Your strongest play style:",
                "options": {
                    "Quick, nimble, attention to detail": {"Seeker": 2},
                    "Team-oriented, scoring focus": {"Chaser": 2},
                    "Sturdy, calm under pressure": {"Keeper": 2},
                    "Aggressive, protective": {"Beater": 2},
                },
            },
            {
                "q": "Pick a training focus:",
                "options": {
                    "Speed drills": {"Seeker": 2},
                    "Shooting practice": {"Chaser": 2},
                    "Goal defense drills": {"Keeper": 2},
                    "Strength & striking": {"Beater": 2},
                },
            },
        ],
    },
    "extras": {
        "name": "Extras",
        "desc": "Add a few fun profile details.",
        "questions": [
            {
                "q": "Choose a dream career:",
                "options": {
                    "Auror (combat & law)": {"Auror": 2},
                    "Healer (St Mungo's)": {"Healer": 2},
                    "Magical researcher or scholar": {"Researcher": 2},
                    "Magizoologist or wandmaker": {"Magizoologist": 2},
                },
            },
            {
                "q": "Choose a favorite spell type:",
                "options": {
                    "Protective & defensive": {"Protego": 2},
                    "Useful everyday magic": {"Accio": 2},
                    "Healing or restorative": {"Episkey": 2},
                    "Illusory or clever tricks": {"Lumos/Obscuro": 2},
                },
            },
        ],
    },
}

# -------------------------
# --- Helper computations
# -------------------------
def _tally_scores_from_questions(questions, answers):
    """Generic tally: questions list with options mapping, answers = list of chosen option strings."""
    scores = {}
    for q, ans in zip(questions, answers):
        if not ans:
            continue
        mapping = q["options"].get(ans)
        if not mapping:
            for k, v in q["options"].items():
                if k.strip().lower() == str(ans).strip().lower():
                    mapping = v
                    break
        if not mapping:
            continue
        for key, pts in mapping.items():
            scores[key] = scores.get(key, 0) + pts
    return scores

def compute_house(answers):
    scores = _tally_scores_from_questions(QUIZ_PARTS["house"]["questions"], answers)
    for h in HOUSE_KEYS:
        scores.setdefault(h, 0)
    max_score = max(scores.values()) if scores else 0
    top = [h for h, s in scores.items() if s == max_score] or [None]
    return random.choice(top), scores

def compute_patronus(answers):
    scores = _tally_scores_from_questions(QUIZ_PARTS["patronus"]["questions"], answers)
    if not scores:
        return None, {}
    max_score = max(scores.values())
    top = [p for p, s in scores.items() if s == max_score]
    return random.choice(top), scores

def compute_wand(answers):
    raw = _tally_scores_from_questions(QUIZ_PARTS["wand"]["questions"], answers)
    wood_counts, core_counts = {}, {}
    for k, v in raw.items():
        if "|" in k:
            wood, core = k.split("|", 1)
            wood_counts[wood] = wood_counts.get(wood, 0) + v
            core_counts[core] = core_counts.get(core, 0) + v
    wood = max(wood_counts, key=wood_counts.get) if wood_counts else None
    core = max(core_counts, key=core_counts.get) if core_counts else None
    suggestion = None
    if wood and core:
        suggestion = f"{wood} (wood) with {core} core"
    elif wood:
        suggestion = f"{wood} (wood)"
    elif core:
        suggestion = f"{core} core"
    return suggestion, {"wood": wood_counts, "core": core_counts}

def compute_bestie(answers):
    scores = _tally_scores_from_questions(QUIZ_PARTS["bestie"]["questions"], answers)
    if not scores:
        return None, {}
    max_score = max(scores.values())
    top = [p for p, s in scores.items() if s == max_score]
    return random.choice(top), scores

def compute_enemy(answers):
    scores = _tally_scores_from_questions(QUIZ_PARTS["enemy"]["questions"], answers)
    if not scores:
        return None, {}
    max_score = max(scores.values())
    top = [p for p, s in scores.items() if s == max_score]
    return random.choice(top), scores

def compute_skills(answers):
    scores = _tally_scores_from_questions(QUIZ_PARTS["skills"]["questions"], answers)
    if not scores:
        return None, {}
    max_score = max(scores.values())
    top = [s for s, v in scores.items() if v == max_score]
    return random.choice(top), scores

def compute_quidditch(answers):
    scores = _tally_scores_from_questions(QUIZ_PARTS["quidditch"]["questions"], answers)
    if not scores:
        return None, {}
    max_score = max(scores.values())
    top = [r for r, v in scores.items() if v == max_score]
    return random.choice(top), scores

def compute_extras(answers):
    scores = _tally_scores_from_questions(QUIZ_PARTS["extras"]["questions"], answers)
    return scores

# -------------------------
# --- API endpoints
# -------------------------
@app.route("/")
def index():
    # Simplify for front-end: part -> {name, desc, questions: [{q, options: [text,...]}]}
    simple = {}
    for key, part in QUIZ_PARTS.items():
        simple[key] = {
            "name": part["name"],
            "desc": part.get("desc", ""),
            "questions": [],
        }
        for q in part["questions"]:
            simple[key]["questions"].append({"q": q["q"], "options": list(q["options"].keys())})
    return render_template("index.html", quiz_parts=simple)

@app.route("/api/submit_part", methods=["POST"])
def submit_part():
    data = request.get_json() or {}
    part = data.get("part")
    answers = data.get("answers", [])
    if part not in QUIZ_PARTS:
        return jsonify({"error": "unknown part"}), 400
    expected_len = len(QUIZ_PARTS[part]["questions"])
    if not isinstance(answers, list) or len(answers) != expected_len:
        return jsonify({"error": f"answers must be a list with length {expected_len}"}), 400

    if part == "house":
        top, scores = compute_house(answers)
    elif part == "patronus":
        top, scores = compute_patronus(answers)
    elif part == "wand":
        suggestion, raw = compute_wand(answers)
        top, scores = suggestion, raw
    elif part == "bestie":
        top, scores = compute_bestie(answers)
    elif part == "enemy":
        top, scores = compute_enemy(answers)
    elif part == "skills":
        top, scores = compute_skills(answers)
    elif part == "quidditch":
        top, scores = compute_quidditch(answers)
    elif part == "extras":
        top, scores = None, compute_extras(answers)
    else:
        top, scores = None, {}

    return jsonify({"part": part, "result": top, "scores": scores})

@app.route("/api/final_result", methods=["POST"])
def final_result():
    data = request.get_json() or {}
    answers_by_part = data.get("answers_by_part", {})
    profile = {}

    house, house_scores = (compute_house(answers_by_part["house"]) if "house" in answers_by_part else (None, {}))
    patronus, patronus_scores = (compute_patronus(answers_by_part["patronus"]) if "patronus" in answers_by_part else (None, {}))
    wand_suggestion, wand_raw = (compute_wand(answers_by_part["wand"]) if "wand" in answers_by_part else (None, {}))
    bestie, bestie_scores = (compute_bestie(answers_by_part["bestie"]) if "bestie" in answers_by_part else (None, {}))
    enemy, enemy_scores = (compute_enemy(answers_by_part["enemy"]) if "enemy" in answers_by_part else (None, {}))
    skill, skill_scores = (compute_skills(answers_by_part["skills"]) if "skills" in answers_by_part else (None, {}))
    role, role_scores = (compute_quidditch(answers_by_part["quidditch"]) if "quidditch" in answers_by_part else (None, {}))
    extras_scores = compute_extras(answers_by_part["extras"]) if "extras" in answers_by_part else {}

    profile["house"] = house
    profile["house_scores"] = house_scores
    profile["patronus"] = patronus
    profile["patronus_scores"] = patronus_scores
    profile["wand"] = wand_suggestion
    profile["wand_raw"] = wand_raw
    profile["bestie"] = bestie
    profile["bestie_scores"] = bestie_scores
    profile["enemy"] = enemy
    profile["enemy_scores"] = enemy_scores
    profile["skill"] = skill
    profile["skill_scores"] = skill_scores
    profile["quidditch_role"] = role
    profile["quidditch_scores"] = role_scores
    profile["extras"] = extras_scores

    descs = {
        "Gryffindor": "Brave, daring, and bold—stands up for others.",
        "Hufflepuff": "Loyal, patient, and kind—values fairness.",
        "Ravenclaw": "Wise, curious, and clever—loves knowledge.",
        "Slytherin": "Ambitious, resourceful, and cunning—seeks success.",
    }
    profile["house_desc"] = descs.get(house, "")
    return jsonify(profile)

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
