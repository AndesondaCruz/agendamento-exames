import axe from 'axe-core';

/**
 * Mesmo escopo da auditoria manual feita no navegador: WCAG 2.0 e 2.1,
 * níveis A e AA.
 */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/**
 * Roda o axe-core e devolve as violações em texto legível (lista vazia = ok).
 * Devolver texto, e não o objeto do axe, faz o teste que falha mostrar na
 * mensagem qual regra quebrou e em qual elemento.
 *
 * Limite conhecido: o jsdom não calcula layout nem CSS, então a regra de
 * contraste de cor não tem como rodar aqui e fica desligada de propósito
 * (sem isso ela só devolveria "incompleto"). Contraste é coberto pela
 * auditoria manual em navegador real, descrita no README.
 */
export async function auditAccessibility(root: HTMLElement): Promise<string[]> {
  const results = await axe.run(root, {
    runOnly: { type: 'tag', values: WCAG_TAGS },
    rules: { 'color-contrast': { enabled: false } },
  });

  return results.violations.map(
    (violation) =>
      `${violation.id} (${violation.impact}): ${violation.help} -> ` +
      violation.nodes.map((node) => JSON.stringify(node.target)).join(' | '),
  );
}
