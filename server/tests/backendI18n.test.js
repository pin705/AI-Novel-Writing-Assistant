const test = require("node:test");
const assert = require("node:assert/strict");
const { z } = require("zod");
const {
  formatValidationIssue,
  localizeApiJsonPayload,
  localizeSseFrame,
  requestLocaleMiddleware,
  translateBackendText,
} = require("../dist/i18n/index.js");

async function runWithLocale(headers, run) {
  const req = { headers };
  const recordedHeaders = new Map();
  const variedHeaders = [];
  const res = {
    setHeader(name, value) {
      recordedHeaders.set(String(name).toLowerCase(), value);
    },
    vary(name) {
      variedHeaders.push(name);
    },
  };

  await new Promise((resolve, reject) => {
    requestLocaleMiddleware(req, res, (error) => {
      if (error) {
        reject(error);
        return;
      }
      Promise.resolve()
        .then(() => run({
          req,
          res,
          getHeader(name) {
            return recordedHeaders.get(String(name).toLowerCase());
          },
          getVary() {
            return variedHeaders.slice();
          },
        }))
        .then(resolve, reject);
    });
  });
}

test("backend i18n defaults API payload errors to Vietnamese", async () => {
  await runWithLocale({}, ({ getHeader }) => {
    const payload = localizeApiJsonPayload({
      success: false,
      error: "接口不存在。",
    });

    assert.equal(getHeader("content-language"), "vi-VN");
    assert.equal(payload.error, "Không tìm thấy endpoint.");
  });
});

test("backend i18n localizes validation details to English", async () => {
  await runWithLocale({ "accept-language": "en-US,en;q=0.9" }, () => {
    const schema = z.object({
      limit: z.coerce.number().int().min(1),
    });

    let detail = "";
    try {
      schema.parse({ limit: 0 });
    } catch (error) {
      detail = formatValidationIssue(error.issues[0]);
    }

    const payload = localizeApiJsonPayload({
      success: false,
      error: "请求参数校验失败。",
      message: detail,
    });

    assert.equal(payload.error, "Request validation failed.");
    assert.equal(payload.message, "limit: must be at least 1.");
  });
});

test("backend i18n lets the explicit app locale override Accept-Language", async () => {
  await runWithLocale({
    "accept-language": "en-US,en;q=0.9",
    "x-ai-novel-locale": "vi-VN",
  }, ({ getHeader, req }) => {
    assert.equal(getHeader("content-language"), "vi-VN");
    assert.equal(req.locale, "vi-VN");
    assert.equal(translateBackendText("服务运行正常。"), "Dịch vụ đang hoạt động bình thường.");
  });
});

test("backend i18n localizes English success messages and SSE frames", async () => {
  await runWithLocale({ "x-ai-novel-locale": "vi-VN" }, () => {
    const payload = localizeApiJsonPayload({
      success: true,
      message: "Task overview loaded.",
    });
    const frame = localizeSseFrame({
      type: "error",
      error: "Task not found.",
    });

    assert.equal(payload.message, "Đã tải tổng quan tác vụ.");
    assert.equal(frame.error, "Không tìm thấy tác vụ.");
  });
});
