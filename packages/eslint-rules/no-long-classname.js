/**
 * @fileoverview className string literal의 한 줄당 클래스 개수가 threshold를 넘으면 warn + autofix
 */

/**
 * 문자열에서 줄 단위로 클래스 개수를 세고, 가장 많은 줄의 개수를 반환
 * @param {string} str
 * @returns {number}
 */
function countMaxClassesPerLine(str) {
  const lines = str.split('\n');
  let max = 0;
  for (const line of lines) {
    const count = line.trim().split(/\s+/).filter(Boolean).length;
    if (count > max) max = count;
  }
  return max;
}

/**
 * className 값 노드에서 string literal을 추출
 * @param {import('estree').Node | null} valueNode
 * @returns {{ str: string, literalNode: import('estree').Node } | null}
 */
function extractStringLiteral(valueNode) {
  if (!valueNode) return null;

  // Shape A: className="foo bar"
  if (valueNode.type === 'Literal' && typeof valueNode.value === 'string') {
    return { str: valueNode.value, literalNode: valueNode };
  }

  // Shape B: className={"foo bar"}
  if (valueNode.type === 'JSXExpressionContainer') {
    const expr = valueNode.expression;
    if (expr.type === 'Literal' && typeof expr.value === 'string') {
      return { str: expr.value, literalNode: expr };
    }
  }

  return null;
}

/**
 * 자동 수정은 불가하지만 검사 가능한 형태에서 string literal을 추출한다
 * Shape C: className={cn('a', 'b', ...)} — CallExpression 인자 중 Literal
 * Shape D: className={cond ? 'a' : 'b'} — ConditionalExpression 분기 중 Literal
 * @param {import('estree').Node | null} valueNode
 * @returns {Array<{ str: string, literalNode: import('estree').Node }>}
 */
function extractInnerLiterals(valueNode) {
  if (!valueNode) return [];
  if (valueNode.type !== 'JSXExpressionContainer') return [];

  const expr = valueNode.expression;
  const literals = [];

  // Shape C: className={cn('a', 'b', ...)}
  if (expr.type === 'CallExpression') {
    for (const arg of expr.arguments) {
      if (arg.type === 'Literal' && typeof arg.value === 'string') {
        literals.push({ str: arg.value, literalNode: arg });
      }
    }
  }

  // Shape D: className={cond ? 'a' : 'b'}
  if (expr.type === 'ConditionalExpression') {
    for (const branch of [expr.consequent, expr.alternate]) {
      if (branch.type === 'Literal' && typeof branch.value === 'string') {
        literals.push({ str: branch.value, literalNode: branch });
      }
    }
  }

  return literals;
}

/**
 * 클래스 목록을 maxClasses개씩 그룹으로 분할
 * @param {string} str
 * @param {number} maxClasses
 * @returns {string[]}
 */
function splitClasses(str, maxClasses) {
  const classes = str.trim().split(/\s+/).filter(Boolean);
  const groups = [];
  for (let i = 0; i < classes.length; i += maxClasses) {
    groups.push(classes.slice(i, i + maxClasses).join(' '));
  }
  return groups;
}

/**
 * Program의 ImportDeclaration에서 cn import 상태 확인
 * @param {import('estree').Program} programBody
 * @param {string} cnImportPath
 * @returns {{ hasCn: boolean, importNode: import('estree').Node | null, lastImportNode: import('estree').Node | null }}
 */
function findCnImport(programBody, cnImportPath) {
  let matchingImport = null;
  let lastImportNode = null;
  let hasCn = false;

  for (const node of programBody) {
    if (node.type === 'ImportDeclaration') {
      lastImportNode = node;
      if (node.source.value === cnImportPath) {
        matchingImport = node;
        for (const specifier of node.specifiers) {
          if (specifier.type === 'ImportSpecifier' && specifier.imported.name === 'cn') {
            hasCn = true;
          }
        }
      }
    }
  }

  return { hasCn, importNode: matchingImport, lastImportNode };
}

export default {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          maxClasses: { type: 'integer', minimum: 1 },
          cnImportPath: { type: ['string', 'null'] },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      tooMany: 'className has a line with {{count}} classes (max {{max}} per line).',
    },
  },

  create(context) {
    const { maxClasses = 5, cnImportPath = null } = context.options[0] ?? {};

    return {
      JSXAttribute(node) {
        if (node.name.name !== 'className') return;
        if (node.value === null) return;

        // Shape A/B: 자동 수정 가능
        const result = extractStringLiteral(node.value);
        if (result) {
          const count = countMaxClassesPerLine(result.str);
          if (count <= maxClasses) return;

          context.report({
            node: result.literalNode,
            messageId: 'tooMany',
            data: { count: String(count), max: String(maxClasses) },
            fix(fixer) {
              if (!cnImportPath) return null;

              const groups = splitClasses(result.str, maxClasses);
              if (groups.length <= 1) return null;

              // cn() 래핑 (cnImportPath 설정됨)
              const cnCall = `{cn(${groups.map((g) => `'${g}'`).join(', ')})}`;
              const fixes = [fixer.replaceText(node.value, cnCall)];

              // import 처리
              const sourceCode = context.sourceCode;
              const programBody = sourceCode.ast.body;
              const { hasCn, importNode, lastImportNode } = findCnImport(programBody, cnImportPath);

              if (!hasCn) {
                if (importNode) {
                  // 같은 경로 import 있지만 cn 없음 → cn 추가
                  const lastSpecifier = importNode.specifiers[importNode.specifiers.length - 1];
                  fixes.push(fixer.insertTextAfter(lastSpecifier, ', cn'));
                } else if (lastImportNode) {
                  // import 자체 없음 → 마지막 import 뒤에 삽입
                  fixes.push(
                    fixer.insertTextAfter(
                      lastImportNode,
                      `\nimport { cn } from '${cnImportPath}';`,
                    ),
                  );
                } else {
                  // import가 하나도 없음 → 파일 맨 위에 삽입
                  fixes.push(
                    fixer.insertTextBefore(
                      programBody[0],
                      `import { cn } from '${cnImportPath}';\n`,
                    ),
                  );
                }
              }

              return fixes;
            },
          });
          return;
        }

        // Shape C/D: 경고만 (자동 수정 없음)
        const innerLiterals = extractInnerLiterals(node.value);
        for (const lit of innerLiterals) {
          const count = countMaxClassesPerLine(lit.str);
          if (count <= maxClasses) continue;
          context.report({
            node: lit.literalNode,
            messageId: 'tooMany',
            data: { count: String(count), max: String(maxClasses) },
          });
        }
      },
    };
  },
};
