import React from "react";
import ReactDOM from "react-dom/client";
import disableDevtool from "disable-devtool";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";

if (process.env.NODE_ENV === "production") {
  disableDevtool();
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);

reportWebVitals();
