extends Area2D

signal died(bacteria)
signal reached_end(bacteria)

@export var max_health: float = 30.0
@export var speed: float = 80.0

var health: float = 30.0
var curve: Curve2D = null
var progress: float = 0.0
var is_dead: bool = false
var _anim_time: float = 0.0
var _base_scale: Vector2 = Vector2.ONE


func _ready() -> void:
	add_to_group("enemies")
	health = max_health
	_base_scale = scale


func setup(p_curve: Curve2D, hp_multiplier: float = 1.0, speed_multiplier: float = 1.0) -> void:
	curve = p_curve
	max_health = max_health * hp_multiplier
	health = max_health
	speed = speed * speed_multiplier
	if curve != null and curve.get_baked_length() > 0.0:
		position = curve.sample_baked(0.0, true)


func _physics_process(delta: float) -> void:
	if is_dead or curve == null:
		return
	var baked_length: float = curve.get_baked_length()
	if baked_length <= 0.0:
		return
	progress += speed * delta
	if progress >= baked_length:
		_reach_end()
		return
	position = curve.sample_baked(progress, true)
	_anim_time += delta
	rotation = sin(_anim_time * 8.0) * 0.25


func take_damage(amount: float) -> void:
	if is_dead:
		return
	health -= amount
	scale = _base_scale * 1.25
	var tw := create_tween()
	tw.tween_property(self, "scale", _base_scale, 0.1)
	if health <= 0.0:
		_die()


func _die() -> void:
	if is_dead:
		return
	is_dead = true
	GameState.add_atp(GameState.ENEMY_REWARD)
	emit_signal("died", self)
	queue_free()


func _reach_end() -> void:
	if is_dead:
		return
	is_dead = true
	GameState.lose_life()
	emit_signal("reached_end", self)
	queue_free()
