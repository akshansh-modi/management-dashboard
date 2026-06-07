import { useState, useCallback } from 'react';
import {
  Row,
  Col,
  Card,
  Typography,
  Segmented,
  Upload,
  Button,
  Alert,
  Table,
  Tag,
  Space,
  Statistic,
  Divider,
  Spin,
  Tooltip,
  Badge,
} from 'antd';
import {
  FileExcelOutlined,
  FileTextOutlined,
  CodeOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  DownloadOutlined,
  ReloadOutlined,
  InboxOutlined,
  ShoppingOutlined,
  TagsOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import type { UploadProps } from 'antd/es/upload';
import type { ColumnsType } from 'antd/es/table';
import { productService } from '../../services/productService';
import { brandService } from '../../services/brandService';
import type { Product, Brand, BulkCreateResult } from '../../types';
import {
  parseCsv,
  parseExcel,
  downloadJson,
  downloadCsvFile,
  downloadExcelTemplate,
} from '../../utils/fileParser';

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

// ── Types ──────────────────────────────────────────────────────────────────

type Format = 'json' | 'csv' | 'excel';
type PanelState = 'idle' | 'uploading' | 'done';
type FailedItem = { index: number; label: string; reason: string };

// ── Templates ──────────────────────────────────────────────────────────────

const PRODUCT_TEMPLATE_JSON = [
  {
    productName: 'Industrial Gloves L',
    sku: 'GLV-L-001',
    productBrandId: '',
    categoryId: '',
    sellerId: '',
    price: 120,
    currency: 'INR',
    stockQuantity: 500,
    unitOfMeasure: 'pair',
    gstRate: 18,
    productDescription: 'Heavy duty industrial gloves',
    hsn: '',
    warranty: '1 year',
    isActive: false,
  },
];

const PRODUCT_TEMPLATE_FLAT = [
  {
    productName: 'Industrial Gloves L',
    sku: 'GLV-L-001',
    productBrandId: '',
    categoryId: '',
    sellerId: '',
    price: 120,
    currency: 'INR',
    stockQuantity: 500,
    unitOfMeasure: 'pair',
    gstRate: 18,
    productDescription: 'Heavy duty industrial gloves',
    hsn: '',
    warranty: '1 year',
  },
];

const BRAND_TEMPLATE_JSON = [
  {
    brandName: '3M',
    brandDescription: 'Science applied to life',
    brandWebsiteUrl: 'https://www.3m.com',
    brandContactEmail: 'contact@3m.com',
    brandContactPhone: '+91-9999999999',
    categoryIds: ['<categoryId1>', '<categoryId2>'],
  },
];

// Flat for CSV/Excel — categoryIds as pipe-separated string
const BRAND_TEMPLATE_FLAT = [
  {
    brandName: '3M',
    brandDescription: 'Science applied to life',
    brandWebsiteUrl: 'https://www.3m.com',
    brandContactEmail: 'contact@3m.com',
    brandContactPhone: '+91-9999999999',
    categoryIds: '<categoryId1>|<categoryId2>',
  },
];

// ── Coercion ───────────────────────────────────────────────────────────────

function coerceProduct(raw: Record<string, unknown>): Partial<Product> {
  const toNum = (v: unknown) => (v !== '' && v != null ? Number(v) : undefined);
  return {
    ...raw,
    price: toNum(raw.price),
    stockQuantity: toNum(raw.stockQuantity),
    gstRate: toNum(raw.gstRate),
    isActive: false, // always draft for bulk
  } as Partial<Product>;
}

function coerceBrand(raw: Record<string, unknown>): Partial<Brand> {
  const ids = raw.categoryIds;
  return {
    ...raw,
    categoryIds:
      typeof ids === 'string'
        ? ids.split('|').map((s) => s.trim()).filter(Boolean)
        : Array.isArray(ids)
        ? ids
        : [],
  } as Partial<Brand>;
}

// ── UploadPanel ─────────────────────────────────────────────────────────────

interface UploadPanelProps {
  title: string;
  icon: React.ReactNode;
  accentColor: string;
  badgeText?: string;
  badgeColor?: string;
  entityType: 'product' | 'brand';
  requiredFields: string[];
  optionalFields: string[];
  templateJson: Record<string, unknown>[];
  templateFlat: Record<string, unknown>[];
  csvNote?: string;
  onUpload: (items: Record<string, unknown>[]) => Promise<BulkCreateResult<unknown>>;
}

function UploadPanel({
  title,
  icon,
  accentColor,
  badgeText,
  badgeColor,
  entityType,
  requiredFields,
  optionalFields,
  templateJson,
  templateFlat,
  csvNote,
  onUpload,
}: UploadPanelProps) {
  const [format, setFormat] = useState<Format>('json');
  const [state, setState] = useState<PanelState>('idle');
  const [result, setResult] = useState<BulkCreateResult<unknown> | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const reset = () => {
    setState('idle');
    setResult(null);
    setParseError(null);
  };

  const processFile = useCallback(
    async (file: File): Promise<false> => {
      setParseError(null);
      let rows: Record<string, unknown>[] = [];

      try {
        if (format === 'json') {
          const text = await file.text();
          const parsed = JSON.parse(text) as unknown;
          if (!Array.isArray(parsed))
            throw new Error('JSON must be an array: [ { ... }, { ... } ]');
          rows = parsed as Record<string, unknown>[];
        } else if (format === 'csv') {
          rows = parseCsv(await file.text());
        } else {
          rows = (await parseExcel(file)) as Record<string, unknown>[];
        }
      } catch (e) {
        setParseError(e instanceof Error ? e.message : 'Could not parse the file.');
        return false;
      }

      if (!rows.length) {
        setParseError('The file has no data rows.');
        return false;
      }

      const coerced =
        entityType === 'product' ? rows.map(coerceProduct) : rows.map(coerceBrand);

      setState('uploading');
      try {
        const res = await onUpload(coerced as Record<string, unknown>[]);
        setResult(res);
        setState('done');
      } catch (e) {
        setParseError(e instanceof Error ? e.message : 'Upload request failed.');
        setState('idle');
      }
      return false;
    },
    [format, entityType, onUpload],
  );

  const handleTemplateDownload = async () => {
    const base = `${entityType}_template`;
    try {
      if (format === 'json') {
        downloadJson(templateJson, `${base}.json`);
      } else if (format === 'csv') {
        downloadCsvFile(templateFlat, `${base}.csv`);
      } else {
        await downloadExcelTemplate(templateFlat, `${base}.xlsx`);
      }
    } catch {
      // Excel CDN unavailable — fall back to CSV
      downloadCsvFile(templateFlat, `${base}.csv`);
    }
  };

  const accept =
    format === 'json' ? '.json' : format === 'csv' ? '.csv' : '.xlsx,.xls';

  const draggerProps: UploadProps = {
    name: 'file',
    multiple: false,
    accept,
    showUploadList: false,
    beforeUpload: processFile,
  };

  const failedCols: ColumnsType<FailedItem> = [
    {
      title: 'Row',
      dataIndex: 'index',
      width: 55,
      render: (v: number) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          #{v + 1}
        </Text>
      ),
    },
    {
      title: 'Item',
      dataIndex: 'label',
      ellipsis: true,
      render: (v: string) => <Text strong style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      ellipsis: true,
      render: (v: string) => (
        <Text type="danger" style={{ fontSize: 12 }}>
          {v}
        </Text>
      ),
    },
  ];

  const formatOptions = [
    {
      label: (
        <Space size={4}>
          <CodeOutlined />
          <span>JSON</span>
        </Space>
      ),
      value: 'json',
    },
    {
      label: (
        <Space size={4}>
          <FileTextOutlined />
          <span>CSV</span>
        </Space>
      ),
      value: 'csv',
    },
    {
      label: (
        <Space size={4}>
          <FileExcelOutlined />
          <span>Excel</span>
        </Space>
      ),
      value: 'excel',
    },
  ];

  return (
    <Card
      style={{
        borderRadius: 12,
        borderTop: `3px solid ${accentColor}`,
        height: '100%',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}
      styles={{ body: { padding: '24px' } }}
    >
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <Space align="center">
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: `${accentColor}18`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              color: accentColor,
            }}
          >
            {icon}
          </div>
          <div>
            <Title level={4} style={{ margin: 0, fontSize: 16 }}>
              {title}
            </Title>
            {badgeText && (
              <Badge
                color={badgeColor ?? accentColor}
                text={
                  <Text style={{ fontSize: 11, color: badgeColor ?? accentColor }}>
                    {badgeText}
                  </Text>
                }
              />
            )}
          </div>
        </Space>
      </div>

      {/* ── Format selector ── */}
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
          FILE FORMAT
        </Text>
        <Segmented
          value={format}
          onChange={(v) => { setFormat(v as Format); setParseError(null); }}
          options={formatOptions}
          block
          style={{ borderRadius: 8 }}
        />
      </div>

      {/* ── Idle state ── */}
      {state === 'idle' && (
        <>
          {/* Info banners */}
          {entityType === 'product' && (
            <Alert
              type="info"
              showIcon
              icon={<InfoCircleOutlined />}
              message={
                <Text style={{ fontSize: 12 }}>
                  <Text strong>Draft mode</Text> — All uploaded products are saved as drafts.
                  Only <Text code style={{ fontSize: 11 }}>productName</Text> is required per row.
                  Review and publish from the Products page.
                </Text>
              }
              style={{ marginBottom: 12, borderRadius: 8 }}
            />
          )}

          {entityType === 'brand' && (
            <Alert
              type="info"
              showIcon
              message={
                <Text style={{ fontSize: 12 }}>
                  Only <Text code style={{ fontSize: 11 }}>brandName</Text> is required per row.
                  All other fields are optional.
                </Text>
              }
              style={{ marginBottom: 12, borderRadius: 8 }}
            />
          )}

          {format === 'csv' && csvNote && (
            <Alert
              type="warning"
              showIcon
              message={<Text style={{ fontSize: 12 }}>{csvNote}</Text>}
              style={{ marginBottom: 12, borderRadius: 8 }}
            />
          )}

          {parseError && (
            <Alert
              type="error"
              showIcon
              closable
              message={parseError}
              onClose={() => setParseError(null)}
              style={{ marginBottom: 12, borderRadius: 8 }}
            />
          )}

          {/* Drop zone */}
          <Dragger
            {...draggerProps}
            style={{ borderRadius: 10, background: `${accentColor}04` }}
          >
            <p className="ant-upload-drag-icon" style={{ marginBottom: 8 }}>
              <InboxOutlined style={{ color: accentColor, fontSize: 36 }} />
            </p>
            <p className="ant-upload-text" style={{ fontSize: 14, fontWeight: 500 }}>
              Click or drag your{' '}
              <Text style={{ color: accentColor }}>
                {format === 'excel' ? '.xlsx / .xls' : `.${format}`}
              </Text>{' '}
              file here
            </p>
            <p className="ant-upload-hint" style={{ fontSize: 12 }}>
              Only the first sheet is read for Excel files
            </p>
          </Dragger>

          {/* Fields + template row */}
          <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ marginBottom: 6 }}>
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em' }}>
                  REQUIRED
                </Text>
                <span style={{ marginLeft: 6 }}>
                  {requiredFields.map((f) => (
                    <Tag key={f} color="red" style={{ fontSize: 11, marginBottom: 4 }}>
                      {f}
                    </Tag>
                  ))}
                </span>
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em' }}>
                  OPTIONAL
                </Text>
                <span style={{ marginLeft: 6 }}>
                  {optionalFields.slice(0, 4).map((f) => (
                    <Tag key={f} style={{ fontSize: 11, marginBottom: 4 }}>
                      {f}
                    </Tag>
                  ))}
                  {optionalFields.length > 4 && (
                    <Tooltip title={optionalFields.slice(4).join(', ')}>
                      <Tag style={{ fontSize: 11, cursor: 'default' }}>
                        +{optionalFields.length - 4} more
                      </Tag>
                    </Tooltip>
                  )}
                </span>
              </div>
            </div>

            <Button
              icon={<DownloadOutlined />}
              size="small"
              onClick={handleTemplateDownload}
              style={{ flexShrink: 0, marginTop: 4 }}
            >
              Download Template
            </Button>
          </div>
        </>
      )}

      {/* ── Uploading state ── */}
      {state === 'uploading' && (
        <div style={{ textAlign: 'center', padding: '52px 0' }}>
          <Spin size="large" />
          <Paragraph type="secondary" style={{ marginTop: 16, marginBottom: 0, fontSize: 13 }}>
            Processing {result === null ? 'your file' : ''}…
          </Paragraph>
        </div>
      )}

      {/* ── Done state ── */}
      {state === 'done' && result && (
        <>
          {/* Summary cards */}
          <Row gutter={12} style={{ marginBottom: 20 }}>
            <Col span={12}>
              <div
                style={{
                  background: '#f6ffed',
                  border: '1px solid #b7eb8f',
                  borderRadius: 10,
                  padding: '16px 12px',
                  textAlign: 'center',
                }}
              >
                <CheckCircleFilled style={{ fontSize: 24, color: '#52c41a', marginBottom: 6 }} />
                <Statistic
                  title={<Text style={{ fontSize: 11, color: '#389e0d' }}>Created</Text>}
                  value={result.created.length}
                  valueStyle={{ color: '#52c41a', fontSize: 28, fontWeight: 700 }}
                />
              </div>
            </Col>
            <Col span={12}>
              <div
                style={{
                  background: result.failed.length > 0 ? '#fff2f0' : '#f6ffed',
                  border: `1px solid ${result.failed.length > 0 ? '#ffccc7' : '#b7eb8f'}`,
                  borderRadius: 10,
                  padding: '16px 12px',
                  textAlign: 'center',
                }}
              >
                {result.failed.length > 0 ? (
                  <CloseCircleFilled style={{ fontSize: 24, color: '#ff4d4f', marginBottom: 6 }} />
                ) : (
                  <CheckCircleFilled style={{ fontSize: 24, color: '#52c41a', marginBottom: 6 }} />
                )}
                <Statistic
                  title={
                    <Text
                      style={{
                        fontSize: 11,
                        color: result.failed.length > 0 ? '#cf1322' : '#389e0d',
                      }}
                    >
                      Failed
                    </Text>
                  }
                  value={result.failed.length}
                  valueStyle={{
                    color: result.failed.length > 0 ? '#ff4d4f' : '#52c41a',
                    fontSize: 28,
                    fontWeight: 700,
                  }}
                />
              </div>
            </Col>
          </Row>

          {/* Partial success banner */}
          {result.created.length > 0 && result.failed.length > 0 && (
            <Alert
              type="warning"
              showIcon
              message={`${result.created.length} item(s) created. ${result.failed.length} item(s) failed — see details below.`}
              style={{ marginBottom: 12, borderRadius: 8, fontSize: 12 }}
            />
          )}
          {result.failed.length === 0 && (
            <Alert
              type="success"
              showIcon
              message={`All ${result.created.length} item(s) were created successfully.`}
              style={{ marginBottom: 12, borderRadius: 8, fontSize: 12 }}
            />
          )}

          {/* Failed items table */}
          {result.failed.length > 0 && (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                <Text strong style={{ fontSize: 13 }}>
                  Failed Items
                </Text>
                <Button
                  size="small"
                  icon={<DownloadOutlined />}
                  onClick={() =>
                    downloadCsvFile(
                      result.failed as unknown as Record<string, unknown>[],
                      `${entityType}_errors.csv`,
                    )
                  }
                >
                  Export Errors
                </Button>
              </div>
              <Table<FailedItem>
                size="small"
                dataSource={result.failed as FailedItem[]}
                columns={failedCols}
                rowKey="index"
                pagination={
                  result.failed.length > 5 ? { pageSize: 5, size: 'small' } : false
                }
                scroll={{ x: 'max-content' }}
                style={{ borderRadius: 8, overflow: 'hidden' }}
              />
            </>
          )}

          <Divider style={{ margin: '16px 0' }} />
          <Button icon={<ReloadOutlined />} onClick={reset} block style={{ borderRadius: 8 }}>
            Upload More
          </Button>
        </>
      )}
    </Card>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function BulkUploadCenter() {
  return (
    <div className="animate-fade-in">
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <Title level={3} style={{ marginBottom: 4 }}>
          Bulk Upload Center
        </Title>
        <Text type="secondary">
          Upload multiple products or brands at once using JSON, CSV, or Excel.
          All uploads are validated per-row — failures don't block the rest of the batch.
        </Text>
      </div>

      <Row gutter={[24, 24]} align="stretch">
        {/* Products panel */}
        <Col xs={24} xl={12}>
          <UploadPanel
            title="Products"
            icon={<ShoppingOutlined />}
            accentColor="#1677ff"
            badgeText="Saved as drafts"
            badgeColor="#fa8c16"
            entityType="product"
            requiredFields={['productName']}
            optionalFields={[
              'sku',
              'productBrandId',
              'categoryId',
              'price',
              'currency',
              'stockQuantity',
              'unitOfMeasure',
              'gstRate',
              'hsn',
              'warranty',
              'productDescription',
              'sellerId',
            ]}
            templateJson={PRODUCT_TEMPLATE_JSON}
            templateFlat={PRODUCT_TEMPLATE_FLAT}
            csvNote="For CSV/Excel: categoryIds and variantAttributes are not supported. Use JSON for complex structures."
            onUpload={(items) =>
              productService.bulkCreate(
                items as Partial<Product>[],
              ) as Promise<BulkCreateResult<unknown>>
            }
          />
        </Col>

        {/* Brands panel */}
        <Col xs={24} xl={12}>
          <UploadPanel
            title="Brands"
            icon={<TagsOutlined />}
            accentColor="#722ed1"
            entityType="brand"
            requiredFields={['brandName']}
            optionalFields={[
              'brandDescription',
              'brandWebsiteUrl',
              'brandContactEmail',
              'brandContactPhone',
              'categoryIds',
            ]}
            templateJson={BRAND_TEMPLATE_JSON}
            templateFlat={BRAND_TEMPLATE_FLAT}
            csvNote="For CSV/Excel: use pipe-separated IDs for categoryIds — e.g. id1|id2"
            onUpload={(items) =>
              brandService.bulkCreate(
                items as Partial<Brand>[],
              ) as Promise<BulkCreateResult<unknown>>
            }
          />
        </Col>
      </Row>
    </div>
  );
}
