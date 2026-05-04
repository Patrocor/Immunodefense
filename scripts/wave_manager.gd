extends Node

signal wave_started(wave_number: int)
signal all_waves_complete

@export var spawn_interval: float = 0.7
@export var time_between_waves: float = 3.0

var _bacteria_scene: PackedScene = preload("res://scenes/Bacteria.tscn")
var _path: Path2D = null
var _spawn_parent: Node = null
var _active_enemies: Array = []
var _waves: Array = [
	{"count": 5, "hp_mult": 1.0, "speed_mult": 1.0},
	{"count": 8, "hp_mult": 1.3, "speed_mult": 1.1},
	{"count": 12, "hp_mult": 1.6, "speed_mult": 1.2},
]


func setup(p_path: Path2D, p_spawn_parent: Node) -> void:
	_path = p_path
	_spawn_parent = p_spawn_parent


func start() -> void:
	_run_waves()


func _run_waves() -> void:
	for i in range(_waves.size()):
		if GameState.is_game_over:
			return
		GameState.set_wave(i + 1)
		emit_signal("wave_started", i + 1)
		await _spawn_wave(_waves[i])
		await _wait_until_clear()
		if GameState.is_game_over:
			return
		if i < _waves.size() - 1:
			await get_tree().create_timer(time_between_waves).timeout
	if not GameState.is_game_over:
		emit_signal("all_waves_complete")
		GameState.trigger_victory()


func _spawn_wave(wave_data: Dictionary) -> void:
	for n in range(wave_data["count"]):
		if GameState.is_game_over:
			return
		_spawn_bacteria(wave_data["hp_mult"], wave_data["speed_mult"])
		await get_tree().create_timer(spawn_interval).timeout


func _spawn_bacteria(hp_mult: float, speed_mult: float) -> void:
	if _spawn_parent == null or _path == null:
		return
	var b = _bacteria_scene.instantiate()
	_spawn_parent.add_child(b)
	if b.has_method("setup"):
		b.setup(_path.curve, hp_mult, speed_mult)
	_active_enemies.append(b)
	if b.has_signal("died"):
		b.died.connect(_on_enemy_removed)
	if b.has_signal("reached_end"):
		b.reached_end.connect(_on_enemy_removed)


func _on_enemy_removed(b) -> void:
	if _active_enemies.has(b):
		_active_enemies.erase(b)


func _wait_until_clear() -> void:
	while true:
		_active_enemies = _active_enemies.filter(func(e): return is_instance_valid(e))
		if _active_enemies.size() == 0 or GameState.is_game_over:
			return
		await get_tree().create_timer(0.2).timeout
