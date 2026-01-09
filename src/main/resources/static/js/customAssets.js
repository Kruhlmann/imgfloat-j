export function createCustomAssetModal({ broadcaster, showToast = globalThis.showToast, onAssetSaved }) {
    const assetModal = document.getElementById("custom-asset-modal");
    const userNameInput = document.getElementById("custom-asset-name");
    const userSourceTextArea = document.getElementById("custom-asset-code");
    const formErrorWrapper = document.getElementById("custom-asset-error");
    const jsErrorTitle = document.getElementById("js-error-title");
    const jsErrorDetails = document.getElementById("js-error-details");
    const form = document.getElementById("custom-asset-form");
    const cancelButton = document.getElementById("custom-asset-cancel");

    const resetErrors = () => {
        if (formErrorWrapper) {
            formErrorWrapper.classList.add("hidden");
        }
        if (jsErrorTitle) {
            jsErrorTitle.textContent = "";
        }
        if (jsErrorDetails) {
            jsErrorDetails.textContent = "";
        }
    };

    const openModal = () => {
        assetModal?.classList.remove("hidden");
    };

    const closeModal = () => {
        assetModal?.classList.add("hidden");
    };

    const openNew = () => {
        if (userNameInput) {
            userNameInput.value = "";
        }
        if (userSourceTextArea) {
            userSourceTextArea.value = "";
            userSourceTextArea.disabled = false;
            userSourceTextArea.dataset.assetId = "";
            userSourceTextArea.placeholder =
                "function init(context, state) {\n\n}\n\nfunction tick(context, state) {\n\n}\n\n// or\n// module.exports.init = (context, state) => {};\n// module.exports.tick = (context, state) => {};";
        }
        resetErrors();
        openModal();
    };

    const openEditor = (asset) => {
        if (!asset) {
            return;
        }
        resetErrors();
        if (userNameInput) {
            userNameInput.value = asset.name || "";
        }
        if (userSourceTextArea) {
            userSourceTextArea.value = "";
            userSourceTextArea.placeholder = "Loading script...";
            userSourceTextArea.disabled = true;
            userSourceTextArea.dataset.assetId = asset.id;
        }
        openModal();

        fetch(asset.url)
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Failed to load script");
                }
                return response.text();
            })
            .then((text) => {
                if (userSourceTextArea) {
                    userSourceTextArea.disabled = false;
                    userSourceTextArea.value = text;
                }
            })
            .catch(() => {
                if (userSourceTextArea) {
                    userSourceTextArea.disabled = false;
                    userSourceTextArea.value = "";
                }
                showToast?.("Unable to load script content.", "error");
            });
    };

    const handleFormSubmit = (formEvent) => {
        formEvent.preventDefault();
        const src = userSourceTextArea?.value;
        const error = getUserJavaScriptSourceError(src);
        if (error) {
            if (jsErrorTitle) {
                jsErrorTitle.textContent = error.title;
            }
            if (jsErrorDetails) {
                jsErrorDetails.textContent = error.details;
            }
            if (formErrorWrapper) {
                formErrorWrapper.classList.remove("hidden");
            }
            return false;
        }
        resetErrors();
        const name = userNameInput?.value?.trim();
        if (!name) {
            if (jsErrorTitle) {
                jsErrorTitle.textContent = "Missing name";
            }
            if (jsErrorDetails) {
                jsErrorDetails.textContent = "Please provide a name for your custom asset.";
            }
            if (formErrorWrapper) {
                formErrorWrapper.classList.remove("hidden");
            }
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
                if (asset) {
                    onAssetSaved?.(asset);
                }
                closeModal();
                showToast?.(assetId ? "Custom asset updated." : "Custom asset created.", "success");
            })
            .catch((e) => {
                showToast?.("Unable to save custom asset. Please try again.", "error");
                console.error(e);
            })
            .finally(() => {
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = "Test and save";
                }
            });
        return false;
    };

    if (assetModal) {
        assetModal.addEventListener("click", (event) => {
            if (event.target === assetModal) {
                closeModal();
            }
        });
    }
    if (form) {
        form.addEventListener("submit", handleFormSubmit);
    }
    if (cancelButton) {
        cancelButton.addEventListener("click", () => closeModal());
    }

    return { openNew, openEditor };

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

        const parser = globalThis.acorn;
        if (!parser) {
            return { title: "Parser unavailable", details: "JavaScript parser is not available yet." };
        }

        try {
            ast = parser.parse(src, {
                ecmaVersion: "latest",
                sourceType: "script",
            });
        } catch (e) {
            return { title: "Syntax Error", details: e.message };
        }

        let hasInit = false;
        let hasTick = false;

        const isFunctionNode = (node) =>
            node && (node.type === "FunctionExpression" || node.type === "ArrowFunctionExpression");

        const markFunctionName = (name) => {
            if (name === "init") hasInit = true;
            if (name === "tick") hasTick = true;
        };

        const isModuleExportsMember = (node) =>
            node &&
            node.type === "MemberExpression" &&
            node.object?.type === "Identifier" &&
            node.object.name === "module" &&
            node.property?.type === "Identifier" &&
            node.property.name === "exports";

        const checkObjectExpression = (objectExpression) => {
            if (!objectExpression || objectExpression.type !== "ObjectExpression") {
                return;
            }
            for (const property of objectExpression.properties || []) {
                if (property.type !== "Property") {
                    continue;
                }
                const keyName = property.key?.type === "Identifier" ? property.key.name : property.key?.value;
                if (keyName && isFunctionNode(property.value)) {
                    markFunctionName(keyName);
                }
            }
        };

        for (const node of ast.body) {
            if (node.type === "FunctionDeclaration") {
                markFunctionName(node.id?.name);
                continue;
            }

            if (node.type !== "ExpressionStatement") continue;

            const expr = node.expression;
            if (expr.type !== "AssignmentExpression") continue;

            const left = expr.left;
            const right = expr.right;

            if (left.type === "Identifier" && left.name === "exports" && right.type === "ObjectExpression") {
                checkObjectExpression(right);
                continue;
            }

            if (isModuleExportsMember(left) && right.type === "ObjectExpression") {
                checkObjectExpression(right);
                continue;
            }

            if (left.type === "MemberExpression" && left.property.type === "Identifier" && isFunctionNode(right)) {
                if (
                    (left.object.type === "Identifier" && left.object.name === "exports") ||
                    isModuleExportsMember(left.object)
                ) {
                    markFunctionName(left.property.name);
                }
            }
        }

        if (!hasInit) {
            return {
                title: "Missing function: init",
                details: "Define a function named init or assign a function to exports.init/module.exports.init.",
            };
        }

        if (!hasTick) {
            return {
                title: "Missing function: tick",
                details: "Define a function named tick or assign a function to exports.tick/module.exports.tick.",
            };
        }

        return undefined;
    }
}
