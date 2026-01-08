const assetModal = document.getElementById("custom-asset-modal");
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
    return false;
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
