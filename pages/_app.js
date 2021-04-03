import React from "react";
import PropTypes from "prop-types";

// https://github.com/vercel/next.js/issues/17574
if (process.env.NODE_ENV === "production") {
  process.on("uncaughtException", (error) => {
    // console.error(error.stack);
    // Don't run process.exit(1)
  });
}

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
}

App.propTypes = {
  Component: PropTypes.func.isRequired,
  pageProps: PropTypes.object.isRequired,
};
