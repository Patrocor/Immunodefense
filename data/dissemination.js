(function (root) {
  root.disseminationOrgans = [
    { id: "corazon",      label: "CORAZÓN",      scenario: "Endocarditis",      color: "#c1416a", tint: "rgba(193, 65, 106, 0.10)" },
    { id: "hueso",        label: "HUESO",        scenario: "Osteomielitis",     color: "#d8c89a", tint: "rgba(216, 200, 154, 0.10)" },
    { id: "articulacion", label: "ARTICULACIÓN", scenario: "Artritis séptica",  color: "#8ec5d0", tint: "rgba(142, 197, 208, 0.10)" }
  ];
  root.organToF2 = {
    corazon:      "endocarditis",
    hueso:        "osteomielitis",
    articulacion: "artritis"
  };
  root.disseminationWaveTable = [
    // Curva suavizada en 12 olas: 4 → 28 gérmenes (+ jefes en 5/6/7/8/11/12).
    // Evita el salto brusco de la ola 5→6 de la curva anterior.
    [["saureus",2,2.20],["pseudomonas",1,2.40],["candida",1,2.20]],
    [["saureus",2,2.00],["pseudomonas",2,2.10],["candida",2,2.00]],
    [["saureus",3,1.85],["pseudomonas",2,1.90],["candida",2,1.85],["sepidermidis",1,2.20]],
    [["saureus",4,1.65],["pseudomonas",3,1.75],["candida",3,1.70]],
    [["saureus",5,1.45],["pseudomonas",3,1.55],["candida",3,1.50],["bossPyogenes",1,4.0]],
    [["saureus",6,1.30],["pseudomonas",4,1.40],["candida",4,1.35],["bossMRSA",1,0]],
    [["saureus",7,1.15],["pseudomonas",5,1.25],["candida",4,1.25],["bossPseudomonas",1,4.0]],
    [["saureus",8,1.05],["pseudomonas",5,1.15],["candida",5,1.15],["bossPyogenes",1,3.5]],
    [["saureus",9,0.95],["pseudomonas",6,1.05],["candida",5,1.05],["bossMRSA",1,3.5]],
    [["saureus",10,0.90],["pseudomonas",7,1.00],["candida",6,1.00],["bossPseudomonas",1,3.5]],
    [["saureus",11,0.85],["pseudomonas",8,0.95],["candida",7,0.95],["bossPyogenes",1,3.0],["bossMRSA",1,3.0]],
    [["saureus",12,0.80],["pseudomonas",9,0.90],["candida",8,0.90],["bossMRSA",1,2.8],["bossPyogenes",1,3.0],["bossPseudomonas",1,4.0]]
  ];
  root.germAffinity = {
    saureus:         [3, 3, 3],
    bossMRSA:        [3, 2, 2],
    pyogenes:        [2, 1, 1],
    bossPyogenes:    [2, 1, 1],
    pseudomonas:     [1, 2, 1],
    bossPseudomonas: [1, 2, 1],
    sepidermidis:    [3, 1, 1],
    candida:         [2, 1, 1]
  };
})(window.ImmunoDefenseData);
