extends Node2D

const PATH_SAFETY_DISTANCE: float = 30.0
const TOWER_SAFETY_DISTANCE: float = 30.0

var _macrophage_scene: PackedScene = preload("res://scenes/Macrophage.tscn")
var _path: Path2D = null
var _towers_node: Node2D = null
var _projectiles_node: Node2D = null
var _wave_manager: Node = null
var _ability_manager: Node = null
var _hud: CanvasLayer = null


func _ready() -> void:
	_path = $Path2D
	_towers_node = $Towers
	_projectiles_node = $Projectiles
	_wave_manager = $WaveManager
	_ability_manager = $AbilityManager
	_hud = $HUD

	GameState.reset()

	_wave_manager.setup(_path, _path)

	if not GameState.game_over_triggered.is_connected(_on_game_over):
		GameState.game_over_triggered.connect(_on_game_over)
	if not GameState.victory_triggered.is_connected(_on_victory):
		GameState.victory_triggered.connect(_on_victory)
	if not _ability_manager.ability_state_changed.is_connected(_on_ability_state_changed):
		_ability_manager.ability_state_changed.connect(_on_ability_state_changed)

	_wave_manager.call_deferred("start")


func _unhandled_input(event: InputEvent) -> void:
	if GameState.is_game_over or GameState.is_victory:
		return
	if event is InputEventMouseButton:
		var mb: InputEventMouseButton = event
		if mb.pressed and mb.button_index == MOUSE_BUTTON_LEFT:
			_try_place_tower(get_global_mouse_position())


func _try_place_tower(world_pos: Vector2) -> void:
	if not GameState.can_afford(GameState.TOWER_COST):
		return
	if _is_too_close_to_path(world_pos):
		return
	if _is_too_close_to_existing_tower(world_pos):
		return
	if not GameState.spend_atp(GameState.TOWER_COST):
		return
	var tower = _macrophage_scene.instantiate()
	_towers_node.add_child(tower)
	tower.global_position = world_pos


func _is_too_close_to_path(world_pos: Vector2) -> bool:
	if _path == null or _path.curve == null:
		return false
	var local: Vector2 = world_pos - _path.global_position
	var closest_local: Vector2 = _path.curve.get_closest_point(local)
	var closest_world: Vector2 = closest_local + _path.global_position
	return closest_world.distance_to(world_pos) < PATH_SAFETY_DISTANCE


func _is_too_close_to_existing_tower(world_pos: Vector2) -> bool:
	for t in _towers_node.get_children():
		if t is Node2D and t.global_position.distance_to(world_pos) < TOWER_SAFETY_DISTANCE:
			return true
	return false


func _on_game_over() -> void:
	pass


func _on_victory() -> void:
	pass


func _on_ability_state_changed(active: bool, cd: float, dur: float) -> void:
	if _hud != null and _hud.has_method("update_ability"):
		_hud.update_ability(active, cd, dur)
