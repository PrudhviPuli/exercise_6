import string
import random
import sqlite3
from datetime import datetime
from flask import *
from functools import wraps

app = Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

def get_db():
    db = getattr(g, '_database', None)

    if db is None:
        db = g._database = sqlite3.connect('db/watchparty.sqlite3')
        db.row_factory = sqlite3.Row
        setattr(g, '_database', db)
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def query_db(query, args=(), one=False):
    db = get_db()
    cursor = db.execute(query, args)
    rows = cursor.fetchall()
    db.commit()
    cursor.close()
    if rows:
        if one: 
            return rows[0]
        return rows
    return None

def new_user():
    name = "Unnamed User #" + ''.join(random.choices(string.digits, k=6))
    password = ''.join(random.choices(string.ascii_lowercase + string.digits, k=10))
    api_key = ''.join(random.choices(string.ascii_lowercase + string.digits, k=40))
    u = query_db('insert into users (name, password, api_key) ' + 
        'values (?, ?, ?) returning id, name, password, api_key',
        (name, password, api_key),
        one=True)
    return u

# TODO: If your app sends users to any other routes, include them here.
#       (This should not be necessary).
@app.route('/')
@app.route('/profile')
@app.route('/login')
@app.route('/room')
@app.route('/room/<chat_id>')
def index(chat_id=None):
    return app.send_static_file('index.html')

@app.errorhandler(404)
def page_not_found(e):
    return app.send_static_file('404.html'), 404


def get_user_from_cookie(request):
    user_id, password = request.cookies.get('user_id'), request.cookies.get('user_password')
    return query_db('select * from users where id = ? and password = ?', (user_id, password), one=True) if user_id and password else None

def authenticateUser(request):
    api_key = request.headers.get('Api-Key')
    if not api_key:
        return None
    
    user = query_db('SELECT * FROM users WHERE api_key = ?', [api_key], one=True)
    return user


# -------------------------------- API ROUTES ----------------------------------

# TODO: Create the API

# @app.route('/api/signup')
# def login():
#   ...

@app.route("/api/signup", methods=["POST"])
def signup():
    user = new_user()
    if user:
        response_data = {
            "api_key": user["api_key"],
            "user_id": user["id"],
            "user_name": user["name"],
        }
        return make_response(jsonify(response_data), 201)
    else:
        return make_response(jsonify({"error": "Unable to create the user!"}), 400)
    
@app.route("/api/login", methods=["POST"])
def login():
    name, password = request.headers.get("userName"), request.headers.get("password")
    u = query_db(
        "SELECT id, api_key, name FROM users WHERE name = ? AND password = ?",
        [name, password],
        one=True,
    )
    return (
        {"api_key": u[1], "user_id": u[0], "user_name": u[2]} if u else {"api_key": ""}
    )
    
@app.route("/api/rooms/new", methods=["POST"])
def create_room():
    user = authenticateUser(request)
    if user:
        name = "Unnamed Room " + "".join(random.choices(string.digits, k=6))
        room = query_db(
            "INSERT INTO rooms (name) VALUES (?) RETURNING id",
            [name],
            one=True
        )
        return {"room_id": room["id"]}
    else:
        return make_response(jsonify({"error": "Unauthorized"}), 401)

@app.route("/api/room/messages", methods=["GET"])
def get_all_messages():
    if authenticateUser(request):
        room_id = request.args.get("room_id")
        msgs = query_db(
            "SELECT m.id, u.name, m.body FROM messages m, users u WHERE m.room_id = ? AND m.user_id = u.id ORDER BY m.id",
            [room_id],
        )
        if msgs == None:
            return {}, 200
        return {
            msg[0]: {"id": msg[0], "name": msg[1], "body": msg[2]} for msg in msgs
        }, 200
    return {"Status": "Unauthorized"}, 401

@app.route("/api/room/post", methods=["POST"])
def post_message():
    if authenticateUser(request):
        query_db(
            "INSERT INTO messages (user_id, room_id, body) VALUES (?, ?, ?)",
            [
                request.headers.get("User-Id"),
                request.args.get("room_id"),
                request.args.get("body"),
            ],
        )
        return {"status": "Success"}, 200
    return {"Status": "Unauthorized"}, 401

@app.route("/api/username/change", methods=["POST"])
def update_username():
    if authenticateUser(request):
        temp = query_db(
            "UPDATE users SET name = ? WHERE api_key = ? RETURNING id, name",
            [request.args.get("user_name"), request.headers.get("Api-Key")],
            one=True,
        )
        return {"name": temp["name"]} if temp else {}
    return {"Status": "Unauthorized"}, 401

@app.route("/api/password/change", methods=["POST"])
def update_password():
    if authenticateUser(request):
        query_db(
            "UPDATE users SET password = ? WHERE api_key = ?",
            [request.args.get("password"), request.headers.get("Api-Key")],
        )
        return {}, 200
    return {"Status": "Unauthorized"}, 401

@app.route("/api/rooms", methods=["GET"])
def get_all_rooms():
    user = authenticateUser(request)
    if user:
        rooms = query_db("SELECT * FROM rooms")
        return jsonify({room["id"]: {"name": room["name"]} for room in rooms})
    else:
        return make_response(jsonify({"error": "Unauthorized"}), 401)

@app.route("/api/room/name/change", methods=["POST"])
def update_room():
    if authenticateUser(request):
        query_db(
            "UPDATE rooms SET name = ? WHERE id = ?",
            [request.args.get("name"), request.args.get("room_id")],
        )
        return {}, 200
    return {"Status": "Unauthorized"}, 401
    
@app.route("/api/signup/details", methods=["POST"])
def signup_details():
    user_details = request.get_json()
    name = user_details.get("userName")
    password = user_details.get("Password")
    api_key = "".join(random.choices(string.ascii_lowercase + string.digits, k=40))
    user = query_db(
        "INSERT INTO users (name, password, api_key) VALUES (?, ?, ?) RETURNING id, name, api_key",
        [name, password, api_key],
        one=True,
    )
    if user:
        return jsonify({
            "api_key": user["api_key"],
            "user_id": user["id"],
            "user_name": user["name"],
        })
    else:
        return make_response(jsonify({"error": "Unable to create the user!"}), 401)

@app.route("/api/error", methods=["POST"])
def panicError():
    return make_response(jsonify({"error": "Not Found"}), 404)


