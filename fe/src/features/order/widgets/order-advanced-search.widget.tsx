import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Collapse,
  CircularProgress,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import { registerSlot } from "@root/core/module/registry";
import { SectionCard } from "@shared/components/ui/section-card";
import { useOrderAdvancedSearchStore } from "@features/order/utils/order-advanced-search.store";
import { useAuthStore } from "@store/auth-store";
import type { CategoryModel } from "@features/category/model/category.model";
import { search as searchCategory } from "@features/category/api/category.api";
import type { ProductModel } from "@features/product/model/product.model";
import { search as searchProduct } from "@features/product/api/product.api";
import { search as searchDepartments } from "@features/department/api/department.api";
import type { DeparmentModel } from "@features/department/model/department.model";
import type { OrderModel } from "@features/order/model/order.model";
import { search as searchOrders } from "@features/order/api/order.api";
import type { ClinicModel } from "@features/clinic/model/clinic.model";
import { search as searchClinics } from "@features/clinic/api/clinic.api";
import type { DentistModel } from "@features/dentist/model/dentist.model";
import { search as searchDentists } from "@features/dentist/api/dentist.api";
import type { PatientModel } from "@features/patient/model/patient.model";
import { search as searchPatients } from "@features/patient/api/patient.api";
import { categoryPath } from "@features/category/utils/category.utils";
import { toast } from "react-hot-toast";
import * as React from "react";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import { OrderCodeText } from "@features/order/components/order-code-text.component";

const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1),
  label: `Tháng ${index + 1}`,
}));

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 12 }, (_, index) => {
  const year = currentYear - index;
  return { value: String(year), label: String(year) };
});

function OrderAdvancedSearchWidget() {
  const canViewDepartment = useAuthStore((state) => state.hasPermission("department.view"));
  const draftFilters = useOrderAdvancedSearchStore((state) => state.draftFilters);
  const appliedFilters = useOrderAdvancedSearchStore((state) => state.appliedFilters);
  const setDraftFilter = useOrderAdvancedSearchStore((state) => state.setDraftFilter);
  const applyFilters = useOrderAdvancedSearchStore((state) => state.applyFilters);
  const resetFilters = useOrderAdvancedSearchStore((state) => state.resetFilters);

  const [categoryKeyword, setCategoryKeyword] = React.useState("");
  const [productKeyword, setProductKeyword] = React.useState("");
  const [departmentKeyword, setDepartmentKeyword] = React.useState("");
  const [orderOptions, setOrderOptions] = React.useState<OrderModel[]>([]);
  const [clinicOptions, setClinicOptions] = React.useState<ClinicModel[]>([]);
  const [dentistOptions, setDentistOptions] = React.useState<DentistModel[]>([]);
  const [patientOptions, setPatientOptions] = React.useState<PatientModel[]>([]);
  const [categoryOptions, setCategoryOptions] = React.useState<CategoryModel[]>([]);
  const [productOptions, setProductOptions] = React.useState<ProductModel[]>([]);
  const [departmentOptions, setDepartmentOptions] = React.useState<DeparmentModel[]>([]);
  const [loadingOrders, setLoadingOrders] = React.useState(false);
  const [loadingClinics, setLoadingClinics] = React.useState(false);
  const [loadingDentists, setLoadingDentists] = React.useState(false);
  const [loadingPatients, setLoadingPatients] = React.useState(false);
  const [loadingCategories, setLoadingCategories] = React.useState(false);
  const [loadingProducts, setLoadingProducts] = React.useState(false);
  const [loadingDepartments, setLoadingDepartments] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const toggleExpanded = React.useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const handleHeaderKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleExpanded();
    }
  }, [toggleExpanded]);

  React.useEffect(() => {
    let active = true;
    const timeoutId = window.setTimeout(async () => {
      setLoadingOrders(true);
      try {
        const result = await searchOrders({
          keyword: draftFilters.orderCode.trim(),
          limit: 20,
          page: 1,
          orderBy: "code",
          direction: "asc",
        });
        if (!active) return;
        setOrderOptions(result.items ?? []);
      } catch {
        if (!active) return;
        setOrderOptions([]);
      } finally {
        if (active) setLoadingOrders(false);
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [draftFilters.orderCode]);

  React.useEffect(() => {
    let active = true;
    const timeoutId = window.setTimeout(async () => {
      setLoadingClinics(true);
      try {
        const result = await searchClinics({
          keyword: draftFilters.clinicName.trim(),
          limit: 20,
          page: 1,
          orderBy: "name",
          direction: "asc",
        });
        if (!active) return;
        setClinicOptions(result.items ?? []);
      } catch {
        if (!active) return;
        setClinicOptions([]);
      } finally {
        if (active) setLoadingClinics(false);
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [draftFilters.clinicName]);

  React.useEffect(() => {
    let active = true;
    const timeoutId = window.setTimeout(async () => {
      setLoadingDentists(true);
      try {
        const result = await searchDentists({
          keyword: draftFilters.dentistName.trim(),
          limit: 20,
          page: 1,
          orderBy: "name",
          direction: "asc",
        });
        if (!active) return;
        setDentistOptions(result.items ?? []);
      } catch {
        if (!active) return;
        setDentistOptions([]);
      } finally {
        if (active) setLoadingDentists(false);
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [draftFilters.dentistName]);

  React.useEffect(() => {
    let active = true;
    const timeoutId = window.setTimeout(async () => {
      setLoadingPatients(true);
      try {
        const result = await searchPatients({
          keyword: draftFilters.patientName.trim(),
          limit: 20,
          page: 1,
          orderBy: "name",
          direction: "asc",
        });
        if (!active) return;
        setPatientOptions(result.items ?? []);
      } catch {
        if (!active) return;
        setPatientOptions([]);
      } finally {
        if (active) setLoadingPatients(false);
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [draftFilters.patientName]);

  React.useEffect(() => {
    if (!canViewDepartment) {
      setDepartmentOptions([]);
      return;
    }

    let active = true;
    const timeoutId = window.setTimeout(async () => {
      setLoadingDepartments(true);
      try {
        const result = await searchDepartments({
          keyword: departmentKeyword,
          limit: 20,
          page: 1,
          orderBy: "name",
          direction: "asc",
        });
        if (!active) return;
        setDepartmentOptions(result.items ?? []);
      } catch {
        if (!active) return;
        setDepartmentOptions([]);
      } finally {
        if (active) setLoadingDepartments(false);
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [canViewDepartment, departmentKeyword]);

  React.useEffect(() => {
    let active = true;
    const timeoutId = window.setTimeout(async () => {
      setLoadingCategories(true);
      try {
        const result = await searchCategory({
          keyword: categoryKeyword,
          limit: 20,
          page: 1,
          orderBy: "code",
          direction: "asc",
        });
        if (!active) return;
        setCategoryOptions(result.items ?? []);
      } catch {
        if (!active) return;
        setCategoryOptions([]);
      } finally {
        if (active) setLoadingCategories(false);
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [categoryKeyword]);

  React.useEffect(() => {
    let active = true;
    const timeoutId = window.setTimeout(async () => {
      setLoadingProducts(true);
      try {
        const result = await searchProduct({
          keyword: productKeyword,
          limit: 20,
          page: 1,
          orderBy: "code",
          direction: "asc",
        });
        if (!active) return;
        setProductOptions(result.items ?? []);
      } catch {
        if (!active) return;
        setProductOptions([]);
      } finally {
        if (active) setLoadingProducts(false);
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [productKeyword]);

  const appliedChips = React.useMemo<Array<{ key: string; label: React.ReactNode }>>(() => {
    const chips: Array<{ key: string; label: React.ReactNode }> = [];
    if (appliedFilters.department?.name) chips.push({ key: "department", label: `Chi nhánh: ${appliedFilters.department.name}` });
    if (appliedFilters.categories.length) chips.push({ key: "categories", label: `Loại phục hình: ${appliedFilters.categories.length}` });
    if (appliedFilters.products.length) chips.push({ key: "products", label: `Sản phẩm: ${appliedFilters.products.length}` });
    if (appliedFilters.orderCode.trim()) {
      const code = appliedFilters.orderCode.trim();
      chips.push({
        key: "orderCode",
        label: <>Mã đơn: <OrderCodeText code={code} /></>,
      });
    }
    if (appliedFilters.clinicName.trim()) chips.push({ key: "clinicName", label: `Nha khoa: ${appliedFilters.clinicName.trim()}` });
    if (appliedFilters.dentistName.trim()) chips.push({ key: "dentistName", label: `Bác sĩ: ${appliedFilters.dentistName.trim()}` });
    if (appliedFilters.patientName.trim()) chips.push({ key: "patientName", label: `Bệnh nhân: ${appliedFilters.patientName.trim()}` });
    if (appliedFilters.createdYear.trim() || appliedFilters.createdMonth.trim()) {
      chips.push({
        key: "createdDate",
        label: `Ngày tạo: ${[appliedFilters.createdMonth.trim(), appliedFilters.createdYear.trim()].filter(Boolean).join("/")}`,
      });
    }
    if (appliedFilters.deliveryYear.trim() || appliedFilters.deliveryMonth.trim()) {
      chips.push({
        key: "deliveryDate",
        label: `Ngày giao: ${[appliedFilters.deliveryMonth.trim(), appliedFilters.deliveryYear.trim()].filter(Boolean).join("/")}`,
      });
    }
    return chips;
  }, [appliedFilters]);

  const handleSearch = React.useCallback(() => {
    if (draftFilters.createdMonth && !draftFilters.createdYear) {
      toast.error("Vui lòng chọn năm tạo khi đã chọn tháng tạo.");
      return;
    }
    if (draftFilters.deliveryMonth && !draftFilters.deliveryYear) {
      toast.error("Vui lòng chọn năm giao khi đã chọn tháng giao.");
      return;
    }
    applyFilters();
  }, [applyFilters, draftFilters]);

  const getOrderOptionLabel = React.useCallback((option: string | OrderModel) => {
    if (typeof option === "string") return option;
    return option.codeLatest?.trim() || option.code?.trim() || "";
  }, []);

  const getNamedOptionLabel = React.useCallback((option: string | { name?: string | null }) => {
    if (typeof option === "string") return option;
    return option.name?.trim() || "";
  }, []);

  const renderLoadingAdornment = React.useCallback(
    (loading: boolean, endAdornment: React.ReactNode) => (
      <>
        {loading ? <CircularProgress size={18} /> : null}
        {endAdornment}
      </>
    ),
    []
  );

  return (
    <SectionCard
      title={
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          onClick={toggleExpanded}
          onKeyDown={handleHeaderKeyDown}
          sx={{
            flex: 1,
            minWidth: 0,
            cursor: "pointer",
            borderRadius: 1,
            "&:focus-visible": (theme) => ({
              outline: `2px solid ${theme.palette.primary.main}`,
              outlineOffset: 2,
            }),
          }}
        >
          <TuneRoundedIcon color="action" />
          <Box>
            <Typography variant="h6" fontWeight={700}>Tìm kiếm nâng cao đơn hàng</Typography>
            <Typography variant="body2" color="text.secondary">
              Lọc trực tiếp danh sách đơn hàng và bộ báo cáo phía dưới.
            </Typography>
          </Box>
        </Stack>
      }
      extra={
        <Stack direction="row" spacing={1}>
          <Tooltip title={expanded ? "Thu gọn" : "Mở rộng"}>
            <IconButton onClick={toggleExpanded} size="small">
              {expanded ? <ExpandLessRoundedIcon /> : <ExpandMoreRoundedIcon />}
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={<RestartAltRoundedIcon />}
            onClick={resetFilters}
          >
            Xóa bộ lọc
          </Button>
          <Button
            variant="contained"
            startIcon={<SearchRoundedIcon />}
            onClick={handleSearch}
          >
            Tìm kiếm
          </Button>
        </Stack>
      }
    >
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Grid container spacing={2}>
          {canViewDepartment ? (
            <Grid size={{ xs: 12, md: 3 }}>
              <Autocomplete
                fullWidth
                size="small"
                options={departmentOptions ?? []}
                filterOptions={(options) => options}
                value={draftFilters.department ?? null}
                loading={loadingDepartments}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                getOptionLabel={(option) => option.name ?? ""}
                onInputChange={(_, value, reason) => {
                  if (reason === "input" || reason === "clear") setDepartmentKeyword(value);
                }}
                onChange={(_, value) => setDraftFilter("department", value)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    label="Chi nhánh"
                    placeholder="Chọn chi nhánh"
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: renderLoadingAdornment(loadingDepartments, params.InputProps.endAdornment),
                    }}
                  />
                )}
              />
            </Grid>
          ) : null}

          <Grid size={{ xs: 12, md: canViewDepartment ? 3 : 4 }}>
            <Autocomplete
              fullWidth
              size="small"
              freeSolo
              options={orderOptions}
              filterOptions={(options) => options}
              value={null}
              inputValue={draftFilters.orderCode}
              loading={loadingOrders}
              getOptionLabel={getOrderOptionLabel}
              onInputChange={(_, value, reason) => {
                if (reason === "input" || reason === "clear") {
                  setDraftFilter("orderCode", value);
                }
              }}
              onChange={(_, value) => {
                const nextValue = value == null ? "" : getOrderOptionLabel(value);
                setDraftFilter("orderCode", nextValue);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  label="Mã đơn hàng"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: renderLoadingAdornment(loadingOrders, params.InputProps.endAdornment),
                  }}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, md: canViewDepartment ? 3 : 4 }}>
            <Autocomplete
              fullWidth
              size="small"
              multiple
              filterSelectedOptions
              options={categoryOptions}
              value={draftFilters.categories}
              loading={loadingCategories}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              getOptionLabel={(option) => categoryPath(option)}
              onInputChange={(_, value, reason) => {
                if (reason === "input") setCategoryKeyword(value);
              }}
              onChange={(_, value) => setDraftFilter("categories", value)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  label="Loại phục hình"
                  placeholder="Tìm loại phục hình"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: renderLoadingAdornment(loadingCategories, params.InputProps.endAdornment),
                  }}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, md: canViewDepartment ? 3 : 4 }}>
            <Autocomplete
              fullWidth
              size="small"
              multiple
              filterSelectedOptions
              options={productOptions}
              value={draftFilters.products}
              loading={loadingProducts}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              getOptionLabel={(option) => [option.code, option.name].filter(Boolean).join(" - ")}
              onInputChange={(_, value, reason) => {
                if (reason === "input") setProductKeyword(value);
              }}
              onChange={(_, value) => setDraftFilter("products", value)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  label="Sản phẩm"
                  placeholder="Tìm sản phẩm"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: renderLoadingAdornment(loadingProducts, params.InputProps.endAdornment),
                  }}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Autocomplete
              fullWidth
              size="small"
              freeSolo
              options={clinicOptions}
              filterOptions={(options) => options}
              value={null}
              inputValue={draftFilters.clinicName}
              loading={loadingClinics}
              getOptionLabel={getNamedOptionLabel}
              onInputChange={(_, value, reason) => {
                if (reason === "input" || reason === "clear") {
                  setDraftFilter("clinicName", value);
                }
              }}
              onChange={(_, value) => {
                const nextValue = value == null ? "" : getNamedOptionLabel(value);
                setDraftFilter("clinicName", nextValue);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  label="Tên nha khoa"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: renderLoadingAdornment(loadingClinics, params.InputProps.endAdornment),
                  }}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Autocomplete
              fullWidth
              size="small"
              freeSolo
              options={dentistOptions}
              filterOptions={(options) => options}
              value={null}
              inputValue={draftFilters.dentistName}
              loading={loadingDentists}
              getOptionLabel={getNamedOptionLabel}
              onInputChange={(_, value, reason) => {
                if (reason === "input" || reason === "clear") {
                  setDraftFilter("dentistName", value);
                }
              }}
              onChange={(_, value) => {
                const nextValue = value == null ? "" : getNamedOptionLabel(value);
                setDraftFilter("dentistName", nextValue);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  label="Tên bác sĩ"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: renderLoadingAdornment(loadingDentists, params.InputProps.endAdornment),
                  }}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Autocomplete
              fullWidth
              size="small"
              freeSolo
              options={patientOptions}
              filterOptions={(options) => options}
              value={null}
              inputValue={draftFilters.patientName}
              loading={loadingPatients}
              getOptionLabel={getNamedOptionLabel}
              onInputChange={(_, value, reason) => {
                if (reason === "input" || reason === "clear") {
                  setDraftFilter("patientName", value);
                }
              }}
              onChange={(_, value) => {
                const nextValue = value == null ? "" : getNamedOptionLabel(value);
                setDraftFilter("patientName", nextValue);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  label="Tên bệnh nhân"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: renderLoadingAdornment(loadingPatients, params.InputProps.endAdornment),
                  }}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  select
                  label="Tháng tạo"
                  value={draftFilters.createdMonth}
                  onChange={(event) => setDraftFilter("createdMonth", event.target.value)}
                >
                  <MenuItem value="">Tất cả</MenuItem>
                  {monthOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  select
                  label="Năm tạo"
                  value={draftFilters.createdYear}
                  onChange={(event) => setDraftFilter("createdYear", event.target.value)}
                >
                  <MenuItem value="">Tất cả</MenuItem>
                  {yearOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  select
                  label="Tháng giao"
                  value={draftFilters.deliveryMonth}
                  onChange={(event) => setDraftFilter("deliveryMonth", event.target.value)}
                >
                  <MenuItem value="">Tất cả</MenuItem>
                  {monthOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  select
                  label="Năm giao"
                  value={draftFilters.deliveryYear}
                  onChange={(event) => setDraftFilter("deliveryYear", event.target.value)}
                >
                  <MenuItem value="">Tất cả</MenuItem>
                  {yearOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          </Grid>
        </Grid>

        <Box sx={{ mt: 2 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {appliedChips.length > 0 ? appliedChips.map((chip) => (
              <Chip key={chip.key} label={chip.label} size="small" color="primary" variant="outlined" />
            )) : (
              <Typography variant="body2" color="text.secondary">
                Chưa áp dụng bộ lọc. Bảng hiện hiển thị danh sách đơn hàng mặc định.
              </Typography>
            )}
          </Stack>
        </Box>
      </Collapse>
    </SectionCard>
  );
}

registerSlot({
  id: "order-advanced-search",
  name: "order:header",
  priority: 100,
  render: () => <OrderAdvancedSearchWidget />,
});
