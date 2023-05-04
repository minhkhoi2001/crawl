const fs = require("fs");
const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");
const he = require("he");

const app = express();
const corsOptions = {
  origin: "http://localhost:3000",
  methods: ["POST"],
  allowedHeaders: ["Content-Type"],
};

app.use(cors(corsOptions));
app.use(express.json());

const readTextFile = (filename) => {
  return fs.readFileSync(filename, "utf8");
};

const headerContent = readTextFile("./header.txt");
const footerContent = readTextFile("./footer.txt");

const char2entity = {
  "'": "&#39;",
  '"': "&quot;",
  "<": "&lt;",
  ">": "&gt;",
  "&": "&amp;",
};
function escape_entities(str) {
  var rv = "";
  for (var i = 0; i < str.length; i++) {
    var ch = str.charAt(i);
    rv += char2entity[ch] || ch;
  }
  return rv;
}
function getCurrentDateString() {
  const now = new Date();
  const isoString = now.toISOString();
  const offsetInMinutes = -now.getTimezoneOffset();
  const offsetSign = offsetInMinutes > 0 ? "-" : "+";
  const offsetHours = String(Math.floor(Math.abs(offsetInMinutes) / 60)).padStart(2, "0");
  const offsetMinutes = String(Math.abs(offsetInMinutes) % 60).padStart(2, "0");
  const offsetString = `${offsetSign}${offsetHours}:${offsetMinutes}`;
  const dateString = isoString.replace("Z", offsetString);
  return dateString;
}

app.post("/crawl", async (req, res) => {
  const { url, containerClass, titleClass, contentClass } = req.body;

  try {
    const browser = await puppeteer.launch({
      executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    });
    const page = await browser.newPage();
    await page.goto(url);
    await page.waitForTimeout(1000);

    const childUrls = await page.$$eval(`${containerClass}`, (elements) =>
      elements.map((element) => element.href)
    );

    let allContent = [];

    for (const childUrl of childUrls) {
      await page.goto(childUrl);
      await page.waitForTimeout(1000);

      const title = await page.$$eval(`${titleClass}`, (elements) =>
        elements.map((element) => element.textContent)
      );

      const content = await page.$$eval(`${contentClass}`, (elements) =>
        elements.map((element) => element.outerHTML.replace(/\n|\r/g, ' '))
      );
      const escapedContent = content.map((item) => escape_entities(item));
      //console.log(escapedContent);
      const fullBody = "<entry><id>tag:blogger.com,1999:blog-1915332153780296371.post-3567890683225363488</id><published>"+getCurrentDateString()+"</published><updated>"+getCurrentDateString()+"</updated><category scheme='http://www.blogger.com/atom/ns#' term='san-pham' /><category scheme='http://schemas.google.com/g/2005#kind' term='http://schemas.google.com/blogger/2008/kind#post' /><title type='text'>"+title+"</title><content type='html'>"+escapedContent+"</content><author><name>Blogger</name><email>noreply@blogger.com</email><gd:image rel='http://schemas.google.com/g/2005#thumbnail' width='32' height='32' src='//4.bp.blogspot.com/-tSozALL3D04/YRsu-CXaPgI/AAAAAAAAGH8/WoROPnh0LE85oDgzjWhOClriKDGGFn6YgCK4BGAYYCw/s32/unnamed.png' /></author><media:thumbnail xmlns:media='http://search.yahoo.com/mrss/' url='https://1.bp.blogspot.com/-3W1kIDutA0o/YVQSGV5SRwI/AAAAAAAAGr0/5DEpsP5RM6orxoS1Q2U6famjDOM5_88UgCLcBGAsYHQ/s72-c/sp2.webp' height='72' width='72' /><thr:total>0</thr:total></entry>";
      allContent.push(...fullBody);
    }

    await browser.close();

    const fullContent = headerContent + allContent.join('') + footerContent;

    res.setHeader("Content-Type", "text/plain");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=crawled-content.xml"
    );
    res.send(fullContent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Lỗi server" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
