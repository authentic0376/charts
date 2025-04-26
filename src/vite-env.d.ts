/// <reference types="vite/client" />  // <--트리플 슬래시 지시문 (컴파일러 지시) vite의 glob, env 등을 ts가 인식하도록

// 다른 타입 정의가 있을 수도 있습니다 (예: 컴포넌트 타입 정의). // 두개짜리는 주석이다
// declare module '*.vue' {
//   import type { DefineComponent } from 'vue'
//   const component: DefineComponent<{}, {}, any>
//   export default component
// }