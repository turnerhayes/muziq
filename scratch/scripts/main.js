var osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay(
  "container",
  {
    autoresize: true,
  }
);

fetch("Chrono Trigger - Wind Scene.xml")
  .then(
    (res) => res.text()
  ).then(
    (xml) => osmd.load(xml)
  ).then(
    () => osmd.render()
  ).catch(
    (err) => console.error(err)
  );
  