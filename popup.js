document.getElementById("openReport").addEventListener("click", function () {
  chrome.tabs.create({ url: "report.html" });
});
