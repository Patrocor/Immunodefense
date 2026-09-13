(function (root) {
  // Identidad visual de órganos F2–F5.
  // Solo endocarditis tiene kit en este pase; el resto sigue el trazo fino
  // de Diseminación (no reabrir F1 ni los otros órganos).
  root.organIdentity = {
    endocarditis: {
      labelKit: "Válvula+Pulso",
      path: {
        outer: "#6a1832",
        mid: "#9a2a4a",
        lumen: "#2c0a14",
        dash: "rgba(255, 196, 210, 0.48)",
        confluence: "#9a2a4a",
        confluenceInner: "#c1416a",
        tick: "rgba(255, 214, 222, 0.55)"
      },
      entry: "auricula",
      focus: "velo",
      hudAccent: true
    }
  };
})(window.ImmunoDefenseData);
