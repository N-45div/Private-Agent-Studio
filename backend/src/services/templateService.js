import { AppError } from "../lib/errors.js";
import { studioTemplates } from "../data/templates.js";

export class TemplateService {
  listTemplates() {
    return studioTemplates;
  }

  getTemplate(templateId) {
    const template = studioTemplates.find((item) => item.id === templateId);
    if (!template) {
      throw new AppError("Template not found", {
        code: "template_not_found",
        statusCode: 404,
      });
    }

    return template;
  }

  getTemplateIds() {
    return studioTemplates.map((template) => template.id);
  }
}
