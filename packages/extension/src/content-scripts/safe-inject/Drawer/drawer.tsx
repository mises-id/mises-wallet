import React from "react";
import { proxyClient } from "../post-message";
import "./drawer.scss";
import { blockem, logo, oklink, prompt } from "./img";

export const Drawer = ({
  type,
  contractAddress,
  actionName,
  assetValue,
  domain,
  suggestedDomain,
  onClose,
}: {
  type: string;
  actionName?: string;
  contractAddress?: string;
  domain?: string;
  suggestedDomain?: string;
  assetValue?: string;
  onClose: () => void;
}) => {
  // const [loading, setLoading] = useState(false);
  // const [visible, setVisible] = useState(true);

  // const getContainer = () =>
  // document.querySelector("#mises-safe-container") as HTMLElement;

  // const hideContainer = () => {
  //   const container = getContainer();
  //   container.setAttribute("style", "display: none");
  // };

  const postMessageToCurrentPage = (decision: string) => {
    // const msg = {
    //   msg: "injectScript",
    //   params: { method: "user_decision", data: { value: decision } },
    // };
    proxyClient.postUserDecision(decision);
  };
  // const handleOk = () => {
  //   // setLoading(true);
  //   setTimeout(() => {
  //     // setLoading(false);
  //     setVisible(false);
  //   }, 3000);
  // };

  // const handleCancel = () => {
  //   onClose();
  // };

  // useEffect(() => {
  //   setVisible(true);
  //   if (type === "success") {
  //     setTimeout(() => {
  //       setVisible(false);
  //     }, 3000);
  //   }
  //   console.log(type)
  // }, []);
  const isTransferAction =
    actionName === "transfer" ||
    actionName === "safeTransferFrom" ||
    actionName === "safeTransferFrom1";
  const assetVal = isTransferAction ? "token" : "";
  const action = isTransferAction ? "transfer" : "authorization";
  const suggestedDomainUrl = () => {
    if (suggestedDomain) {
      if (
        suggestedDomain?.indexOf("http://") > -1 ||
        suggestedDomain?.indexOf("https://") > -1
      ) {
        return suggestedDomain;
      }
      return `https://${suggestedDomain}`;
    }
    return "";
  };
  return (
    <React.Fragment>
      <div className="mises-drawer-mask" />
      <div className="mises-drawer-container">
        <div className="logo-container">
          <div className="logo-content">
            <img src={logo} alt="" className="logo" />
          </div>
        </div>
        <div className="modal-content">
          <img src={prompt} alt="" className="prompt" />
          <p className="phishing-tips">Mises Anti-phishing System</p>
          {type === "domainAlert" || type === "domainHandler" ? (
            <React.Fragment>
              <div className="domain-content">
                <p>
                  This domain: <span className="value">{domain}</span>
                </p>
                <p>May trick you into doing something</p>
                <p>dangerous:</p>
              </div>
              <div className="tips">
                <p>·Steal your private key</p>
                <p>·Trick you into giving them the token approval</p>
                <p>·Buying scam tokens etc.</p>
              </div>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <p className="domain-content">
                This contract address:{" "}
                <span
                  className="value"
                  onClick={() => {
                    window.location.replace(
                      `https://etherscan.io/address/${contractAddress}`
                    );
                  }}
                >
                  {contractAddress}
                </span>
                Is on the Blacklist of Mises Anti-phishing System
              </p>
              <p className="contract-tips">
                Please notice a high risk of stolen assets if you continue.
              </p>
            </React.Fragment>
          )}
          {type === "domainAlert" || type === "domainHandler" ? (
            <React.Fragment>
              <div
                className="danger-button"
                onClick={() => {
                  postMessageToCurrentPage("block");
                  suggestedDomain
                    ? window.location.replace(suggestedDomainUrl())
                    : onClose();
                }}
              >
                {suggestedDomain === "" ? "Got it" : `Go to ${suggestedDomain}`}
              </div>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <div
                className="danger-button"
                onClick={() => {
                  postMessageToCurrentPage("block");
                  onClose();
                }}
              >
                Terminate the {action}
              </div>
            </React.Fragment>
          )}
          <div
            className="secondary-button"
            onClick={() => {
              postMessageToCurrentPage("continue");
              onClose();
            }}
          >
            {type === "contractAlert" ? "Continue" : "Ignore"}
          </div>
          <p className="powered">
            <span>
              Powered by {type === "contractAlert" ? "Blockem" : "OKLink"}
            </span>
          </p>
          <div className="powered-logo-container">
            <img
              src={type === "contractAlert" ? blockem : oklink}
              alt=""
              className="powered-logo"
            />
          </div>
        </div>
      </div>
    </React.Fragment>
  );

  // if (type === "domainAlert" || type === "domainHandler") {
  //   return (

  //   );
  // }

  // if (type === "contractAlert") {
  //   const primaryColor = "rgb(217, 48, 37)";
  //   const isTransferAction =
  //     actionName === "transfer" ||
  //     actionName === "safeTransferFrom" ||
  //     actionName === "safeTransferFrom1";
  //   const assetVal = isTransferAction ? <Text code>{assetValue}</Text> : "assets";
  //   const action = isTransferAction ? "transfer" : "authorize";
  //   return (
  //     <Modal
  //       closable={false}
  //       width={460}
  //       getContainer={getContainer()}
  //       open={visible}
  //       onOk={handleOk}
  //       footer={null}
  //       className={`notification-en`}
  //     >
  //       <div id="chrome-extension-content-base-element-ethereum-notification-content">
  //         <div style={{ margin: "0px 13px 32px 13px" }}>
  //           {/* <img src={TriangleRed} style={{ width: "80px" }} alt="" /> */}
  //         </div>
  //         <div style={{ margin: "0px 13px 32px 13px" }}>
  //           <h1
  //             className={`careful-auth-en`}
  //             style={{
  //               color: primaryColor,
  //               display: "flex",
  //               marginTop: "30px",
  //               marginBottom: "36px",
  //               fontSize: "36px",
  //               fontWeight: 400,
  //             }}
  //           >
  //             Phishing Alert!
  //           </h1>
  //           {/* 您正在试图…… */}
  //           <b>
  //             <p style={{ marginBottom: "4px", color: "rgba(52, 48, 46, 1)" }}>
  //               You are trying to
  //               {assetVal}
  //               <Tooltip
  //                 getPopupContainer={() => getModalContainer()}
  //                 title={
  //                   <div
  //                     style={{
  //                       margin: "12px",
  //                       fontSize: "8px",
  //                       color: "#767676",
  //                     }}
  //                   >
  //                     <p>
  //                       This transaction will require you to send ETH to an
  //                       address, which is a high-risk behavior. If you are
  //                       performing non-sending behaviors such as mint, it means
  //                       that the website is fraudulent.
  //                     </p>
  //                   </div>
  //                 }
  //                 color="#ffffff"
  //               >
  //                 <Text>{action}</Text>
  //                 <QuestionCircleOutlined
  //                   style={{
  //                     display: "inlineBlock",
  //                     verticalAlign: "baseline",
  //                     fontSize: "14px",
  //                     padding: "0 2px 0px 2px",
  //                   }}
  //                 />
  //               </Tooltip>
  //               {assetVal} to address
  //             </p>
  //           </b>
  //           {getModalContent()}
  //         </div>
  //         <Row justify="space-between">
  //           <Col
  //             span={12}
  //             style={{
  //               display: "flex",
  //               justifyContent: "start",
  //               alignItems: "center",
  //             }}
  //           >
  //             <button
  //               className="danger-button"
  //               onClick={() => {
  //                 postMessageToCurrentPage("block");
  //                 handleCancel();
  //               }}
  //               type="button"
  //             >
  //               Got it
  //             </button>
  //           </Col>
  //           <Col
  //             span={12}
  //             style={{
  //               display: "flex",
  //               justifyContent: "end",
  //               alignItems: "center",
  //             }}
  //           >
  //             <button
  //               className="secondary-button"
  //               type="button"
  //               onClick={() => {
  //                 postMessageToCurrentPage("continue");
  //                 handleCancel();
  //               }}
  //             >
  //               Ignore
  //             </button>
  //           </Col>
  //         </Row>
  //       </div>
  //     </Modal>
  //   );
  // }
  // return <div></div>
};
