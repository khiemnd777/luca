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
import { categoryPath } from "@features/category/utils/category.utils";
import { toast } from "react-hot-toast";
import * as React from "react";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";

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
  const [categoryOptions, setCategoryOptions] = React.useState<CategoryModel[]>([]);
  const [productOptions, setProductOptions] = React.useState<ProductModel[]>([]);
  const [departmentOptions, setDepartmentOptions] = React.useState<DeparmentModel[]>([]);
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

  const appliedChips = React.useMemo(() => {
    const chips: string[] = [];
    if (appliedFilters.department?.name) chips.push(`Chi nhánh: ${appliedFilters.department.name}`);
    if (appliedFilters.categories.length) chips.push(`Loại phục hình: ${appliedFilters.categories.length}`);
    if (appliedFilters.products.length) chips.push(`Sản phẩm: ${appliedFilters.products.length}`);
    if (appliedFilters.orderCode.trim()) chips.push(`Mã đơn: ${appliedFilters.orderCode.trim()}`);
    if (appliedFilters.clinicName.trim()) chips.push(`Nha khoa: ${appliedFilters.clinicName.trim()}`);
    if (appliedFilters.dentistName.trim()) chips.push(`Bác sĩ: ${appliedFilters.dentistName.trim()}`);
    if (appliedFilters.patientName.trim()) chips.push(`Bệnh nhân: ${appliedFilters.patientName.trim()}`);
    if (appliedFilters.createdYear.trim() || appliedFilters.createdMonth.trim()) {
      chips.push(`Ngày tạo: ${[appliedFilters.createdMonth.trim(), appliedFilters.createdYear.trim()].filter(Boolean).join("/")}`);
    }
    if (appliedFilters.deliveryYear.trim() || appliedFilters.deliveryMonth.trim()) {
      chips.push(`Ngày giao: ${[appliedFilters.deliveryMonth.trim(), appliedFilters.deliveryYear.trim()].filter(Boolean).join("/")}`);
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
                    label="Chi nhánh"
                    placeholder="Chọn chi nhánh"
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loadingDepartments ? <CircularProgress size={18} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            </Grid>
          ) : null}

          <Grid size={{ xs: 12, md: canViewDepartment ? 3 : 4 }}>
            <TextField
              fullWidth
              label="Mã đơn hàng"
              value={draftFilters.orderCode}
              onChange={(event) => setDraftFilter("orderCode", event.target.value)}
            />
          </Grid>

          <Grid size={{ xs: 12, md: canViewDepartment ? 3 : 4 }}>
            <Autocomplete
              fullWidth
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
                  label="Loại phục hình"
                  placeholder="Tìm loại phục hình"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingCategories ? <CircularProgress size={18} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, md: canViewDepartment ? 3 : 4 }}>
            <Autocomplete
              fullWidth
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
                  label="Sản phẩm"
                  placeholder="Tìm sản phẩm"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingProducts ? <CircularProgress size={18} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              label="Tên nha khoa"
              value={draftFilters.clinicName}
              onChange={(event) => setDraftFilter("clinicName", event.target.value)}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              label="Tên bác sĩ"
              value={draftFilters.dentistName}
              onChange={(event) => setDraftFilter("dentistName", event.target.value)}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              label="Tên bệnh nhân"
              value={draftFilters.patientName}
              onChange={(event) => setDraftFilter("patientName", event.target.value)}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
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
              <Chip key={chip} label={chip} size="small" color="primary" variant="outlined" />
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
