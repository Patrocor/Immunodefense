extends Node

signal ability_state_changed(active: bool, cooldown_left: float, duration_left: float)

const DURATION: float = 5.0
const COOLDOWN: float = 10.0
const DAMAGE_MULTIPLIER: float = 2.0

var is_active: bool = false
var duration_left: float = 0.0
var cooldown_left: float = 0.0


func _ready() -> void:
	emit_signal("ability_state_changed", is_active, cooldown_left, duration_left)


func _process(delta: float) -> void:
	if GameState.is_game_over or GameState.is_victory:
		return
	var changed: bool = false
	if is_active:
		duration_left -= delta
		changed = true
		if duration_left <= 0.0:
			duration_left = 0.0
			is_active = false
			GameState.damage_multiplier = 1.0
			cooldown_left = COOLDOWN
	elif cooldown_left > 0.0:
		cooldown_left -= delta
		changed = true
		if cooldown_left < 0.0:
			cooldown_left = 0.0
	if changed:
		emit_signal("ability_state_changed", is_active, cooldown_left, duration_left)


func _input(event: InputEvent) -> void:
	if event is InputEventKey:
		var ek: InputEventKey = event
		if ek.pressed and not ek.echo and ek.keycode == KEY_SPACE:
			try_activate()


func try_activate() -> bool:
	if GameState.is_game_over or GameState.is_victory:
		return false
	if is_active:
		return false
	if cooldown_left > 0.0:
		return false
	is_active = true
	duration_left = DURATION
	GameState.damage_multiplier = DAMAGE_MULTIPLIER
	emit_signal("ability_state_changed", is_active, cooldown_left, duration_left)
	return true
