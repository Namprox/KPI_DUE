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
    md5: "d6692dd335c3c6b2ad020e2758eed628",
  });
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);

reportWebVitals();
