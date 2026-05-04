extends CanvasLayer

@onready var atp_label: Label = $ATPLabel
@onready var lives_label: Label = $LivesLabel
@onready var wave_label: Label = $WaveLabel
@onready var ability_label: Label = $AbilityLabel
@onready var status_label: Label = $StatusLabel


func _ready() -> void:
	GameState.atp_changed.connect(_on_atp_changed)
	GameState.lives_changed.connect(_on_lives_changed)
	GameState.wave_changed.connect(_on_wave_changed)
	GameState.game_over_triggered.connect(_on_game_over)
	GameState.victory_triggered.connect(_on_victory)
	_on_atp_changed(GameState.atp)
	_on_lives_changed(GameState.lives)
	_on_wave_changed(GameState.current_wave, GameState.MAX_WAVES)
	status_label.visible = false
	update_ability(false, 0.0, 0.0)


func _on_atp_changed(value: int) -> void:
	atp_label.text = "ATP: %d" % value


func _on_lives_changed(value: int) -> void:
	lives_label.text = "Vida: %d" % value


func _on_wave_changed(current: int, total: int) -> void:
	wave_label.text = "Oleada: %d / %d" % [current, total]


func _on_game_over() -> void:
	status_label.text = "DERROTA"
	status_label.modulate = Color(1, 0.3, 0.3, 1)
	status_label.visible = true


func _on_victory() -> void:
	status_label.text = "VICTORIA"
	status_label.modulate = Color(0.3, 1, 0.4, 1)
	status_label.visible = true


func update_ability(active: bool, cooldown_left: float, duration_left: float) -> void:
	if active:
		ability_label.text = "Inflamacion: ACTIVA (%.1fs)" % duration_left
		ability_label.modulate = Color(1, 0.9, 0.2, 1)
	elif cooldown_left > 0.0:
		ability_label.text = "Inflamacion: cooldown %.1fs" % cooldown_left
		ability_label.modulate = Color(0.7, 0.7, 0.7, 1)
	else:
		ability_label.text = "Inflamacion: LISTA [SPACE]"
		ability_label.modulate = Color(1, 1, 1, 1)
