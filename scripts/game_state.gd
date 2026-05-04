extends Node

signal atp_changed(value: int)
signal lives_changed(value: int)
signal wave_changed(current: int, total: int)
signal game_over_triggered
signal victory_triggered

const STARTING_ATP: int = 100
const STARTING_LIVES: int = 10
const TOWER_COST: int = 50
const ENEMY_REWARD: int = 10
const MAX_WAVES: int = 3

var atp: int = STARTING_ATP
var lives: int = STARTING_LIVES
var current_wave: int = 0
var damage_multiplier: float = 1.0
var is_game_over: bool = false
var is_victory: bool = false


func reset() -> void:
	atp = STARTING_ATP
	lives = STARTING_LIVES
	current_wave = 0
	damage_multiplier = 1.0
	is_game_over = false
	is_victory = false
	get_tree().paused = false
	emit_signal("atp_changed", atp)
	emit_signal("lives_changed", lives)
	emit_signal("wave_changed", current_wave, MAX_WAVES)


func add_atp(amount: int) -> void:
	atp += amount
	emit_signal("atp_changed", atp)


func can_afford(amount: int) -> bool:
	return atp >= amount


func spend_atp(amount: int) -> bool:
	if atp < amount:
		return false
	atp -= amount
	emit_signal("atp_changed", atp)
	return true


func lose_life() -> void:
	if is_game_over or is_victory:
		return
	lives -= 1
	if lives < 0:
		lives = 0
	emit_signal("lives_changed", lives)
	if lives <= 0:
		_trigger_game_over()


func set_wave(value: int) -> void:
	current_wave = value
	emit_signal("wave_changed", current_wave, MAX_WAVES)


func trigger_victory() -> void:
	if is_victory or is_game_over:
		return
	is_victory = true
	emit_signal("victory_triggered")
	get_tree().paused = true


func _trigger_game_over() -> void:
	if is_game_over:
		return
	is_game_over = true
	emit_signal("game_over_triggered")
	get_tree().paused = true
