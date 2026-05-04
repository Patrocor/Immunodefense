extends Area2D

@export var damage: float = 10.0
@export var attack_rate: float = 1.5  # disparos por segundo
@export var attack_range: float = 120.0

var _enemies_in_range: Array = []
var _cooldown: float = 0.0
var _projectile_scene: PackedScene = preload("res://scenes/Projectile.tscn")


func _ready() -> void:
	add_to_group("towers")
	_apply_range_to_shape()
	if not area_entered.is_connected(_on_area_entered):
		area_entered.connect(_on_area_entered)
	if not area_exited.is_connected(_on_area_exited):
		area_exited.connect(_on_area_exited)


func _apply_range_to_shape() -> void:
	var shape_node: CollisionShape2D = $CollisionShape2D
	if shape_node and shape_node.shape is CircleShape2D:
		(shape_node.shape as CircleShape2D).radius = attack_range


func _process(delta: float) -> void:
	_cooldown -= delta
	_clean_invalid_enemies()
	if _cooldown <= 0.0 and _enemies_in_range.size() > 0:
		var target: Node = _select_target()
		if target != null:
			_shoot(target)
			_cooldown = 1.0 / max(attack_rate, 0.01)


func _clean_invalid_enemies() -> void:
	for i in range(_enemies_in_range.size() - 1, -1, -1):
		var e = _enemies_in_range[i]
		if not is_instance_valid(e) or e.is_dead:
			_enemies_in_range.remove_at(i)


func _select_target() -> Node:
	var best: Node = null
	var best_progress: float = -1.0
	for e in _enemies_in_range:
		if is_instance_valid(e) and not e.is_dead:
			if e.progress > best_progress:
				best_progress = e.progress
				best = e
	return best


func _shoot(target: Node) -> void:
	var proj = _projectile_scene.instantiate()
	var projectiles_parent: Node = get_tree().current_scene.get_node_or_null("Projectiles")
	if projectiles_parent == null:
		projectiles_parent = get_tree().current_scene
	projectiles_parent.add_child(proj)
	proj.global_position = global_position
	if proj.has_method("setup"):
		proj.setup(target, damage * GameState.damage_multiplier)


func _on_area_entered(area: Area2D) -> void:
	if area.is_in_group("enemies") and not _enemies_in_range.has(area):
		_enemies_in_range.append(area)


func _on_area_exited(area: Area2D) -> void:
	if _enemies_in_range.has(area):
		_enemies_in_range.erase(area)
