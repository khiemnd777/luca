import { describe, expect, test } from "bun:test";
import { packageData, type MetaBlock } from "../../../src/core/form/auto-form-package";
import {
  expectSubmitDtoContainer,
  mapPackagedDto,
  resolveSubmitValues,
} from "../../../src/core/form/submit-contract";
import { buildDepartmentWirePayload } from "../../../src/features/department/utils/department-phone.utils";

describe("AutoForm packaging", () => {
  test("packages flat values when no metadata is present", () => {
    expect(packageData([], { name: "Alpha", active: true })).toEqual({
      dto: {
        name: "Alpha",
        active: true,
      },
      collections: [],
    });
  });

  test("packages custom fields and metadata collections", () => {
    const metadataBlocks: MetaBlock[] = [
      {
        meta: {
          metadata: {
            collection: "department",
          },
        },
        fields: [{ name: "customFields.favoriteColor" }],
        collections: ["department"],
      },
    ];

    expect(
      packageData(metadataBlocks, {
        name: "North Branch",
        "customFields.favoriteColor": "Blue",
      }),
    ).toEqual({
      dto: {
        name: "North Branch",
        custom_fields: {
          favorite_color: "Blue",
        },
      },
      collections: ["department"],
    });
  });

  test("documents the numeric suffix camel_to_snake output", () => {
    expect(packageData([], { phoneNumber2: "0987" })).toEqual({
      dto: {
        phone_number2: "0987",
      },
      collections: [],
    });
  });

  test("feature api helpers can normalize numeric suffix keys for backend payloads", () => {
    expect(buildDepartmentWirePayload({ phoneNumber2: "0987" })).toMatchObject({
      phone_number_2: "0987",
    });

    expect(buildDepartmentWirePayload({ phone_number2: "0987" })).toMatchObject({
      phone_number_2: "0987",
    });
  });
});

describe("AutoForm submit contract", () => {
  test("submit.run receives packaged output when mapToDto is absent", async () => {
    const submitRun = async (values: unknown) => values;
    const values = resolveSubmitValues([], { name: "Alpha" });

    await expect(submitRun(values)).resolves.toEqual({
      dto: {
        name: "Alpha",
      },
      collections: [],
    });
  });

  test("submit.run receives the flat dto returned by mapToDto", async () => {
    const submitRun = async (values: unknown) => values;
    const values = resolveSubmitValues(
      [],
      { name: "Alpha" },
      mapPackagedDto((dto) => ({
        ...dto,
        slug: "alpha",
      })),
    );

    await expect(submitRun(values)).resolves.toEqual({
      name: "Alpha",
      slug: "alpha",
    });
  });

  test("submit.run receives a preserved { dto, collections } container when mapToDto returns it", async () => {
    const metadataBlocks: MetaBlock[] = [
      {
        meta: {
          metadata: {
            collection: "department",
          },
        },
        fields: [{ name: "customFields.favoriteColor" }],
        collections: ["department"],
      },
    ];
    const submitRun = async (values: unknown) => values;
    const values = resolveSubmitValues(
      metadataBlocks,
      {
        name: "North Branch",
        "customFields.favoriteColor": "Blue",
      },
      (packaged) => ({
        dto: {
          ...packaged.dto,
          status: "draft",
        },
        collections: packaged.collections,
      }),
    );

    await expect(submitRun(values)).resolves.toEqual({
      dto: {
        name: "North Branch",
        custom_fields: {
          favorite_color: "Blue",
        },
        status: "draft",
      },
      collections: ["department"],
    });
  });

  test("container-only submit consumers fail fast when mapToDto flattens the payload", () => {
    const values = resolveSubmitValues(
      [],
      { name: "Alpha" },
      mapPackagedDto((dto) => dto),
    );

    expect(() => expectSubmitDtoContainer(values)).toThrow(
      "AutoForm submit values do not include { dto, collections }.",
    );
  });
});
