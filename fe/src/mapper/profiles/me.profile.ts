import { mapper, ignore, convert } from "@core/mapper/auto-mapper";

mapper.register({
  name: "Me",
  dtoToModelNaming: "snake_to_camel",  // mặc định: snake_case -> camelCase
  modelToDtoNaming: "camel_to_snake",  // ngược lại
  rules: [
    // password không bao giờ map ra ngoài
    ignore("password"),

    // ví dụ convert avatar rỗng -> null
    convert("avatar", "avatar", (v) => (v === "" ? null : v)),

    // ví dụ gán const nếu cần
    // konst("source", "api"),
  ],
});
