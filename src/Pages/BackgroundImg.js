import React from "react";

const BackgroundImg = ({ imageUrl, children }) => {
  const styles = {
    background: `url(${imageUrl}) no-repeat center center/cover`,
    minHeight: "100vh",
    width: "100%",
  };

  return <div style={styles}>{children}</div>;
};

export default BackgroundImg;
