import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Autocomplete,
  Button,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import { SectionCard } from "@shared/components/ui/section-card";
import type { SystemLogDirection, SystemLogsFilters } from "@features/observability_logs/model/system-log.model";

type SystemLogFilterBarProps = {
  value: SystemLogsFilters;
  keywordInput: string;
  loading?: boolean;
  onChange: (patch: Partial<SystemLogsFilters>) => void;
  onKeywordInputChange: (value: string) => void;
  onRefresh: () => void;
  onReset: () => void;
};

const LEVEL_OPTIONS = ["warn", "error"];

export function SystemLogFilterBar({
  value,
  keywordInput,
  loading = false,
  onChange,
  onKeywordInputChange,
  onRefresh,
  onReset,
}: SystemLogFilterBarProps) {
  return (
    <SectionCard
      title="Bộ lọc Logs"
      extra={
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<RestartAltRoundedIcon />}
            onClick={onReset}
            disabled={loading}
          >
            Đặt lại
          </Button>
          <Button
            variant="contained"
            startIcon={<RefreshRoundedIcon />}
            onClick={onRefresh}
            disabled={loading}
          >
            Làm mới
          </Button>
        </Stack>
      }
    >
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 3 }}>
          <TextField
            fullWidth
            label="Từ thời gian"
            type="datetime-local"
            value={value.from ? value.from.slice(0, 16) : ""}
            onChange={(event) => onChange({ from: event.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <TextField
            fullWidth
            label="Đến thời gian"
            type="datetime-local"
            value={value.to ? value.to.slice(0, 16) : ""}
            onChange={(event) => onChange({ to: event.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <Autocomplete
            multiple
            options={LEVEL_OPTIONS}
            value={value.level ?? []}
            onChange={(_, next) => onChange({ level: next })}
            renderInput={(params) => (
              <TextField {...params} label="Level" />
            )}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <TextField
            fullWidth
            label="Direction"
            select
            value={value.direction ?? "backward"}
            onChange={(event) => onChange({ direction: event.target.value as SystemLogDirection })}
          >
            <MenuItem value="backward">Newest first</MenuItem>
            <MenuItem value="forward">Oldest first</MenuItem>
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <TextField
            fullWidth
            label="Keyword"
            value={keywordInput}
            onChange={(event) => onKeywordInputChange(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <TextField
            fullWidth
            label="Module"
            value={value.module ?? ""}
            onChange={(event) => onChange({ module: event.target.value })}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <TextField
            fullWidth
            label="Service"
            value={value.service ?? ""}
            onChange={(event) => onChange({ service: event.target.value })}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <TextField
            fullWidth
            label="Env"
            value={value.env ?? ""}
            onChange={(event) => onChange({ env: event.target.value })}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <TextField
            fullWidth
            label="Request ID"
            value={value.requestId ?? ""}
            onChange={(event) => onChange({ requestId: event.target.value })}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <TextField
            fullWidth
            label="User ID"
            value={value.userId ?? ""}
            onChange={(event) => onChange({ userId: event.target.value })}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <TextField
            fullWidth
            label="Department ID"
            value={value.departmentId ?? ""}
            onChange={(event) => onChange({ departmentId: event.target.value })}
          />
        </Grid>
      </Grid>
    </SectionCard>
  );
}
