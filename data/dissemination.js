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
    [["saureus",2,2.20],["pseudomonas",1,2.40],["candida",1,2.20]],
    [["saureus",3,1.85],["pseudomonas",2,2.00],["candida",1,2.00]],
    [["saureus",4,1.55],["pseudomonas",2,1.70],["candida",2,1.65],["bossMRSA",1,0]],
    [["saureus",6,1.30],["pseudomonas",3,1.40],["candida",3,1.40]],
    [["saureus",7,1.05],["pseudomonas",4,1.20],["candida",3,1.30],["bossPyogenes",1,4.0]],
    [["saureus",10,0.90],["pseudomonas",5,1.10],["candida",4,1.20],["bossMRSA",2,3.0],["bossPyogenes",1,4.0]],
    [["saureus",11,0.85],["pseudomonas",6,1.05],["candida",5,1.15],["bossPseudomonas",1,4.0]],
    [["saureus",12,0.80],["pseudomonas",7,1.00],["candida",5,1.10],["bossMRSA",2,3.5]],
    [["saureus",13,0.75],["pseudomonas",7,0.95],["candida",6,1.05],["bossPyogenes",1,3.5],["bossPseudomonas",1,4.0]],
    [["saureus",14,0.72],["pseudomonas",8,0.90],["candida",6,1.00],["bossMRSA",2,3.0]],
    [["saureus",15,0.68],["pseudomonas",9,0.85],["candida",7,0.95],["bossPyogenes",2,3.5],["bossPseudomonas",1,4.0]],
    [["saureus",18,0.62],["pseudomonas",10,0.80],["candida",8,0.90],["bossMRSA",2,2.8],["bossPyogenes",1,3.5],["bossPseudomonas",1,4.0]]
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
