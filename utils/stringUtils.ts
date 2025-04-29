/**
 * 문자열 내의 언더스코어(_)를 공백(' ')으로 바꾸고,
 * 맨 앞이나 맨 뒤에 있는 언더스코어는 제거하는 함수
 *
 * @param inputString 처리할 원본 문자열
 * @returns 변환된 문자열
 */
export function replaceUnderscoresAndTrimEdges(inputString: string): string {
  if (!inputString) {
    return ""; // 입력이 null, undefined 또는 빈 문자열이면 그대로 반환
  }

  // 1. 맨 앞 또는 맨 뒤에 있는 하나 이상의 언더스코어를 제거합니다.
  //    - ^_+ : 문자열 시작(^) 부분의 하나 이상(+)의 언더스코어(_)
  //    - |   : 또는
  //    - _+$ : 문자열 끝($) 부분의 하나 이상(+)의 언더스코어(_)
  //    - g   : 문자열 전체에서 모든 패턴을 찾음 (앞뒤 모두 처리하기 위함)
  let processedString = inputString.replace(/^_+|_+$/g, '');

  // 2. 남은 문자열 내부의 모든 언더스코어를 공백으로 바꿉니다.
  //    - _ : 언더스코어
  //    - g : 문자열 전체에서 모든 언더스코어를 찾음
  processedString = processedString.replace(/_/g, ' ');

  return processedString;
}
