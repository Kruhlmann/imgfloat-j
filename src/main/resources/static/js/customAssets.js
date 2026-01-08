const assetModal = document.getElementById("custom-asset-modal");
const userNameInput = document.getElementById("custom-asset-name");
const userSourceTextArea = document.getElementById("custom-asset-code");
const formErrorWrapper = document.getElementById("custom-asset-error");
const jsErrorTitle = document.getElementById("js-error-title");
const jsErrorDetails = document.getElementById("js-error-details");

function toggleCustomAssetModal(event) {
    if (event !== undefined && event.target !== event.currentTarget) {
        return;
    }
    if (assetModal.classList.contains("hidden")) {
        assetModal.classList.remove("hidden");
        if (userNameInput) {
            userNameInput.value = "";
        }
        if (userSourceTextArea) {
            userSourceTextArea.value = "";
            userSourceTextArea.disabled = false;
            userSourceTextArea.dataset.assetId = "";
            userSourceTextArea.placeholder =
                "function init({ surface, assets, channel }) {\n\n}\n\nfunction tick() {\n\n}";
        }
        if (formErrorWrapper) {
            formErrorWrapper.classList.add("hidden");
        }
        if (jsErrorTitle) {
            jsErrorTitle.textContent = "";
        }
        if (jsErrorDetails) {
            jsErrorDetails.textContent = "";
        }
    } else {
        assetModal.classList.add("hidden");
    }
}

function submitCodeAsset(formEvent) {
    formEvent.preventDefault();
    const src = userSourceTextArea.value;
    const error = getUserJavaScriptSourceError(src);
    if (error) {
        jsErrorTitle.textContent = error.title;
        jsErrorDetails.textContent = error.details;
        formErrorWrapper.classList.remove("hidden");
        return false;
    }
    formErrorWrapper.classList.add("hidden");
    jsErrorTitle.textContent = "";
    jsErrorDetails.textContent = "";
    const name = userNameInput?.value?.trim();
    if (!name) {
        jsErrorTitle.textContent = "Missing name";
        jsErrorDetails.textContent = "Please provide a name for your custom asset.";
        formErrorWrapper.classList.remove("hidden");
        return false;
    }
    const assetId = userSourceTextArea?.dataset?.assetId;
    const submitButton = formEvent.currentTarget?.querySelector('button[type="submit"]');
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Saving...";
    }
    saveCodeAsset({ name, src, assetId })
        .then((asset) => {
            if (asset && typeof storeAsset === "function") {
                storeAsset(asset);
                if (typeof updateRenderState === "function") {
                    updateRenderState(asset);
                }
                if (typeof selectedAssetId !== "undefined") {
                    selectedAssetId = asset.id;
                }
                if (typeof updateSelectedAssetControls === "function") {
                    updateSelectedAssetControls(asset);
                }
                if (typeof drawAndList === "function") {
                    drawAndList();
                }
            }
            if (assetModal) {
                assetModal.classList.add("hidden");
            }
            if (typeof showToast === "function") {
                showToast(assetId ? "Custom asset updated." : "Custom asset created.", "success");
            }
        })
        .catch((e) => {
            if (typeof showToast === "function") {
                showToast("Unable to save custom asset. Please try again.", "error");
            }
            console.error(e);
        })
        .finally(() => {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = "Test and save";
            }
        });
    return false;
}

function saveCodeAsset({ name, src, assetId }) {
    const payload = { name, source: src };
    const method = assetId ? "PUT" : "POST";
    const url = assetId
        ? `/api/channels/${encodeURIComponent(broadcaster)}/assets/${assetId}/code`
        : `/api/channels/${encodeURIComponent(broadcaster)}/assets/code`;
    return fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    }).then((response) => {
        if (!response.ok) {
            throw new Error("Failed to save code asset");
        }
        return response.json();
    });
}

function getUserJavaScriptSourceError(src) {
    let ast;

    try {
        ast = acorn.parse(src, {
            ecmaVersion: "latest",
            sourceType: "script",
        });
    } catch (e) {
        return { title: "Syntax Error", details: e.message };
    }

    let hasInit = false;
    let hasTick = false;

    for (const node of ast.body) {
        if (node.type !== "ExpressionStatement") continue;

        const expr = node.expression;
        if (expr.type !== "AssignmentExpression") continue;

        const left = expr.left;
        const right = expr.right;

        if (
            left.type === "MemberExpression" &&
            left.object.type === "Identifier" &&
            left.object.name === "exports" &&
            left.property.type === "Identifier" &&
            (right.type === "FunctionExpression" || right.type === "ArrowFunctionExpression")
        ) {
            if (left.property.name === "init") hasInit = true;
            if (left.property.name === "tick") hasTick = true;
        }
    }

    if (!hasInit) {
        return {
            title: "Missing function: init",
            details: "You must assign a function to exports.init",
        };
    }

    if (!hasTick) {
        return {
            title: "Missing function: tick",
            details: "You must assign a function to exports.tick",
        };
    }

    return undefined;
}
