extends Area2D

@export var speed: float = 420.0

var _target: Node = null
var _damage: float = 10.0
var _has_hit: bool = false


func _ready() -> void:
	if not area_entered.is_connected(_on_area_entered):
		area_entered.connect(_on_area_entered)


func setup(target: Node, dmg: float) -> void:
	_target = target
	_damage = dmg


func _physics_process(delta: float) -> void:
	if _has_hit:
		return
	if not _is_target_valid():
		queue_free()
		return
	var to_target: Vector2 = _target.global_position - global_position
	var dist: float = to_target.length()
	if dist < 6.0:
		_apply_hit(_target)
		return
	rotation = to_target.angle()
	global_position += to_target.normalized() * speed * delta


func _is_target_valid() -> bool:
	if _target == null:
		return false
	if not is_instance_valid(_target):
		return false
	if "is_dead" in _target and _target.is_dead:
		return false
	return true


func _on_area_entered(area: Area2D) -> void:
	if _has_hit:
		return
	if area == _target and area.is_in_group("enemies"):
		_apply_hit(area)


func _apply_hit(enemy: Node) -> void:
	if _has_hit:
		return
	_has_hit = true
	if is_instance_valid(enemy) and enemy.has_method("take_damage"):
		enemy.take_damage(_damage)
	queue_free()
