import React from "react";
import ReactDOM from "react-dom/client";
import disableDevtool from "disable-devtool";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";

if (
  process.env.NODE_ENV === "production" &&
  process.env.REACT_APP_DISABLE_DEVTOOL !== "false"
) {
  disableDevtool({
    url: "https://scv.udn.vn/huylv",
    disableMenu: false,
    tkName: "debug",
    md5: "11929f3ef892b084af900ab1a488e211",
  });
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);

reportWebVitals();
