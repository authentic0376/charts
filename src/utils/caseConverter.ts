// src/router/index.ts 또는 src/utils/caseConverter.ts

/**
 * 파스칼 케이스 문자열을 스네이크 케이스로 변환합니다. ('View' 접미사 제거 포함)
 * 예: PascalCaseView -> pascal_case
 * 예: TestView -> test
 * @param str 변환할 파스칼 케이스 문자열 (예: 'MyComponentView')
 * @returns 스네이크 케이스 문자열 (예: 'my_component')
 */
export function pascalToSnake(str: string): string {
    // 'View' 접미사 제거
    const baseName = str.replace(/View$/, '');
    // PascalCase를 snake_case로 변환
    return baseName
        .replace(/([A-Z])/g, (match, letter, index) => {
            // 첫 글자를 제외한 대문자 앞에 언더스코어(_) 추가
            return index === 0 ? letter : `_${letter}`;
        })
        .toLowerCase(); // 전체를 소문자로 변환
}