(function (root) {
  root.waveTable = {
    1:  [["sepidermidis",6,1.2],["cacnes",3,1.4]],
    2:  [["sepidermidis",5,1.0],["cacnes",3,1.2],["bossPyogenes",1,0]],
    3:  [["sepidermidis",4,1.0],["hsv",6,0.55],["molluscum",3,0.9],["demodex",2,1.2]],
    4:  [["cacnes",3,1.0],["hsv",6,0.5],["saureus",2,1.0],["demodex",3,1.0],["bossPseudomonas",1,0]],
    5:  [["saureus",3,1.0],["hsv",7,0.5],["malassezia",3,0.9],["dermatofito",2,1.0],["demodex",2,1.0],["neisseria",2,1.2]],
    6:  [["saureus",4,1.0],["hsv",7,0.5],["sarna",3,1.0],["molluscum",3,0.9],["neisseria",3,1.0],["leishmania",2,1.3]],
    7:  [["saureus",4,1.0],["pseudomonas",3,0.9],["sarna",3,1.0],["hpv",3,1.0],["neisseria",2,0.9],["leishmania",3,1.0],["bossClostridium",1,0]],
    8:  [["saureus",5,0.95],["hsv",7,0.5],["pseudomonas",4,0.9],["hpv",3,0.9],["sarna",2,1.0],["leishmania",3,0.9],["candida",2,0.9]],
    9:  [["saureus",6,0.9],["hsv",8,0.45],["pseudomonas",5,0.85],["hpv",4,0.9],["dermatofito",2,1.0],["malassezia",3,0.9],["leishmania",2,0.9]],
    10: [["saureus",6,0.9],["hsv",6,0.45],["pseudomonas",5,0.85],["hpv",3,0.9],["bossMRSA",1,0]]
  };
  root.basicTowers = ["neutrofilo", "queratinocito", "mastocito"];
  root.unlockSchedule = {
    2: "langerhans",
    3: "nk",
    4: "eosinofilo",
    5: "linfocitoB",
    6: "sebocito",
    7: "pdc",
    8: "linfocitoT",
    9: "linfocitogd"
  };
  root.phase1CatchupTowers = [
    "langerhans", "nk", "eosinofilo", "linfocitoB", "sebocito", "pdc",
    "linfocitoT", "complemento", "centinela", "linfocitogd"
  ];
  root.bossTankDrops = { bossPyogenes: "complemento", bossMRSA: "centinela" };
  root.dissemUnlockSchedule = {};
})(window.ImmunoDefenseData);
