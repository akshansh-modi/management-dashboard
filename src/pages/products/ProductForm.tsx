import { useEffect, useState } from 'react';
import {
  Typography,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Button,
  Row,
  Col,
  Space,
  Spin,
  Alert,
  Card,
  Divider,
  App,
  Upload,
  Tag,
  Tooltip,
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined, PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';

/** Default heading derived from a variant's attribute values — mirrors the backend. */
function deriveHeading(attributes?: Record<string, string>): string {
  return Object.values(attributes ?? {})
    .filter((v) => v && String(v).trim())
    .join(' / ');
}
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { productService } from '../../services/productService';
import { userService } from '../../services/userService';
import type { Product, Brand, Category, DiscountPolicy, AdminUser, FilterConfig } from '../../types';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import { uploadService } from '../../services/uploadService';
import { filterService } from '../../services/filterService';
import { slugify } from '../../utils/stringUtils';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface FormValues {
  productName: string;
  sku: string;
  productBrandId: string;
  categoryId: string;
  price: number;
  stockQuantity?: number;
  gstRate?: number;
  hsn?: string;
  unitOfMeasure?: string;
  productDescription?: string;
  productImagesUrl?: string[];
  discountPolicyId?: string;
  sellerId?: string;
  warranty?: string;
  supportDetails?: string;
  isActive: boolean;
  technicalSpecs?: Array<{ key: string; value: string }>;
  variantAttributes?: string[];
  variants?: VariantRow[];
}

interface VariantRow {
  variantId?: string;
  heading?: string;
  sku?: string;
  price?: number;
  stockQuantity?: number;
  gstRate?: number;
  isActive?: boolean;
  attributes?: Record<string, string>;
}

function SpecValueField({ name, restField, form, variantAttributes, getSpecValueControl }: any) {
  const specKey = Form.useWatch(['technicalSpecs', name, 'key'], form);
  const isVariant = specKey && variantAttributes.includes(specKey);
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <Form.Item
        {...restField}
        name={[name, 'value']}
        rules={[{ required: true, message: 'Missing specification value' }]}
      >
        {getSpecValueControl(specKey)}
      </Form.Item>
      {isVariant && (
        <Tooltip title="This attribute is also a variant dimension — value is set per variant">
          <Tag color="blue" style={{ width: 'fit-content', marginTop: -12, marginBottom: 12 }}>variant</Tag>
        </Tooltip>
      )}
    </div>
  );
}

export default function ProductForm() {
  const { productId } = useParams();
  const isEdit = Boolean(productId);
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const variantAttributes: string[] = Form.useWatch('variantAttributes', form) || [];
  const hasVariants = variantAttributes.length > 0;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [policies, setPolicies] = useState<DiscountPolicy[]>([]);
  const [sellers, setSellers] = useState<AdminUser[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [categoryFilters, setCategoryFilters] = useState<FilterConfig[]>([]);

  const handleCategoryChange = async (categoryId: string) => {
    form.setFieldValue('categoryId', categoryId);
    try {
      const filters = await filterService.getForCategory(categoryId);
      setCategoryFilters(filters);
      prefillSpecsFromFilters(filters);
    } catch {
      // non-critical — form still usable without filter prefill
    }
  };

  const prefillSpecsFromFilters = (filters: FilterConfig[]) => {
    const existing: Array<{ key: string; value: string }> =
      form.getFieldValue('technicalSpecs') ?? [];
    const existingKeys = new Set(existing.map(s => s.key));
    const toAdd = filters
      .filter(f => !existingKeys.has(f.id))
      .map(f => ({ key: f.id, value: '' }));
    if (toAdd.length > 0) {
      form.setFieldsValue({ technicalSpecs: [...existing, ...toAdd] });
    }
  };

  const getSpecValueControl = (specKey?: string) => {
    if (!specKey) return <Input placeholder="Spec value" />;
    const filter = categoryFilters.find(f => f.id === specKey);
    if (!filter) return <Input placeholder="Spec value" />;

    if (filter.type === 'single-select') {
      return (
        <Select
          placeholder="Select value"
          options={(filter.options ?? []).map(o => ({ value: o, label: o }))}
        />
      );
    }
    if (filter.type === 'multi-select') {
      return (
        <Select
          mode="multiple"
          placeholder="Select values"
          options={(filter.options ?? []).map(o => ({ value: o, label: o }))}
        />
      );
    }
    if (filter.type === 'range') {
      return (
        <InputNumber
          min={filter.min}
          max={filter.max}
          placeholder={filter.unit ? `Value in ${filter.unit}` : 'Numeric value'}
          style={{ width: '100%' }}
        />
      );
    }
    return <Input />;
  };

  // Load reference data (and the product itself when editing)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [brandList, catList, policyList] = await Promise.all([
          productService.listBrands().catch(() => []),
          productService.listCategories().catch(() => []),
          productService.listDiscountPolicies().catch(() => []),
        ]);
        if (cancelled) return;
        setBrands(brandList);
        setCategories(catList);
        setPolicies(policyList);

        if (isAdmin) {
          userService.listSellers().then((s) => !cancelled && setSellers(s)).catch(() => {});
        }

        if (isEdit && productId) {
          const product = await productService.getById(productId);
          if (cancelled) return;

          if (product.categoryId) {
            const filters = await filterService.getForCategory(product.categoryId).catch(() => []);
            if (!cancelled) setCategoryFilters(filters);
          }

          form.setFieldsValue({
            productName: product.productName,
            sku: product.sku,
            productBrandId: product.productBrandId,
            categoryId: product.categoryId,
            price: product.price,
            stockQuantity: product.stockQuantity,
            gstRate: product.gstRate ?? 18,
            hsn: product.hsn,
            unitOfMeasure: product.unitOfMeasure,
            productDescription: product.productDescription,
            productImagesUrl: product.productImagesUrl ?? [],
            discountPolicyId: product.discountPolicy?.policyId,
            sellerId: product.sellerId,
            warranty: product.warranty,
            supportDetails: product.supportDetails,
            isActive: product.isActive !== false,
            technicalSpecs: Object.entries(product.attributes ?? {}).map(([k, v]) => ({
              key: k,
              value: String(v),
            })),
            variantAttributes: product.variantAttributes ?? [],
            variants: (product.variants ?? []).map((v) => ({
              variantId: v.variantId,
              // Show a heading only when it's a real override (differs from the
              // attribute-derived default), so blank stays blank and re-derives.
              heading: v.heading && v.heading !== deriveHeading(v.attributes) ? v.heading : undefined,
              sku: v.sku,
              price: v.price,
              stockQuantity: v.stockQuantity,
              gstRate: v.gstRate,
              isActive: v.isActive ?? true,
              attributes: v.attributes ?? {},
            })),
          });

          const urls = product.productImagesUrl ?? [];
          setFileList(
            urls.map((url, idx) => ({
              uid: `existing-${idx}`,
              name: url.split('/').pop() || `Image ${idx + 1}`,
              status: 'done',
              url: url,
            }))
          );
        }
      } catch (e) {
        const err = e as { response?: { data?: { message?: string } }; message?: string };
        if (!cancelled) setLoadError(err?.response?.data?.message || err?.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, productId, isAdmin, form]);

  const handleCustomUpload: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options;
    setUploading(true);
    try {
      const productName = form.getFieldValue('productName');
      const brandId = form.getFieldValue('productBrandId');
      const brand = brands.find((b) => b.brandId === brandId);

      if (!brandId || !brand || !productName?.trim()) {
        message.error('Please select a Brand and enter the Product Name before uploading images.');
        setUploading(false);
        onError?.(new Error('Missing brand or product name'));
        return;
      }

      const brandSlug = slugify(brand.brandName);
      const productSlug = slugify(productName);
      const folder = `brands/${brandSlug}/products/${productSlug}`;

      const url = await uploadService.uploadImage(file as File, folder);
      const currentUrls = form.getFieldValue('productImagesUrl') || [];
      const newUrls = [...currentUrls, url];
      form.setFieldValue('productImagesUrl', newUrls);

      setFileList((prev) => [
        ...prev,
        {
          uid: String(Date.now()),
          name: (file as File).name,
          status: 'done',
          url: url,
        },
      ]);
      onSuccess?.('ok');
      message.success('Image uploaded successfully');
    } catch (err) {
      message.error('Image upload failed');
      onError?.(err as Error);
    } finally {
      setUploading(false);
    }
  };

  const handleAddManualUrl = () => {
    if (!manualUrl.trim()) return;
    const url = manualUrl.trim();
    const currentUrls = form.getFieldValue('productImagesUrl') || [];
    const newUrls = [...currentUrls, url];
    form.setFieldValue('productImagesUrl', newUrls);
    
    setFileList((prev) => [
      ...prev,
      {
        uid: `manual-${Date.now()}`,
        name: url.split('/').pop() || `Image ${newUrls.length}`,
        status: 'done',
        url: url,
      },
    ]);
    setManualUrl('');
    message.success('Image URL added');
  };

  const uploadProps: UploadProps = {
    customRequest: handleCustomUpload,
    fileList,
    onRemove: (file) => {
      const urlToRemove = file.url;
      const currentUrls = form.getFieldValue('productImagesUrl') || [];
      const newUrls = currentUrls.filter((u: string) => u !== urlToRemove);
      form.setFieldValue('productImagesUrl', newUrls);
      setFileList((prev) => prev.filter((item) => item.uid !== file.uid));
    },
    accept: 'image/*',
    listType: 'picture-card',
  };

  const handleSaveWithActiveStatus = (isActive: boolean) => {
    setIsDraftSaving(!isActive);
    form.setFieldValue('isActive', isActive);
    setTimeout(() => {
      form.submit();
    }, 0);
  };

  const onFinish = async (values: FormValues) => {
    setSaving(true);
    try {
      const brandName = brands.find((b) => b.brandId === values.productBrandId)?.brandName;
      const payload: Partial<Product> = {
        productName: values.productName,
        sku: values.sku,
        productBrandId: values.productBrandId,
        brandName,
        categoryId: values.categoryId,
        price: values.price,
        stockQuantity: values.stockQuantity,
        gstRate: values.gstRate,
        hsn: values.hsn,
        unitOfMeasure: values.unitOfMeasure,
        productDescription: values.productDescription,
        productImagesUrl: values.productImagesUrl,
        warranty: values.warranty,
        supportDetails: values.supportDetails,
        isActive: values.isActive,
        discountPolicy: values.discountPolicyId ? { policyId: values.discountPolicyId } : null,
      };
      if (isAdmin && values.sellerId) payload.sellerId = values.sellerId;

      // Product Specs (Attributes)
      const attributesRecord: Record<string, string> = {};
      (values.technicalSpecs ?? []).forEach((spec) => {
        if (spec.key?.trim() && spec.value?.trim()) {
          attributesRecord[spec.key.trim()] = spec.value.trim();
        }
      });
      payload.attributes = attributesRecord;

      // Variants — each carries its own price/stock/heading. A blank heading is
      // sent as undefined so the backend re-derives the default from attributes.
      payload.variantAttributes = values.variantAttributes ?? [];
      if (hasVariants) {
        const variantList = (values.variants ?? []).map((v) => ({
          variantId: v.variantId,
          sku: v.sku,
          heading: v.heading?.trim() ? v.heading.trim() : undefined,
          price: v.price,
          stockQuantity: v.stockQuantity,
          gstRate: v.gstRate,
          isActive: v.isActive ?? true,
          attributes: v.attributes ?? {},
        }));
        if (variantList.length) payload.variants = variantList;
      } else {
        payload.variants = [
          {
            variantId: values.variants?.[0]?.variantId, // preserve existing variantId if present
            sku: values.sku,
            price: values.price,
            stockQuantity: values.stockQuantity ?? 0,
            gstRate: values.gstRate ?? 18,
            isActive: values.isActive,
            attributes: {},
          },
        ];
      }

      if (isEdit && productId) {
        await productService.update(productId, payload);
        message.success('Product updated');
      } else {
        await productService.create(payload);
        message.success('Product created');
      }
      navigate('/products');
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      message.error(err?.response?.data?.message || err?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 12, color: '#6B7280' }}>Loading…</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <Space style={{ marginBottom: 4 }}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/products')} />
          <Title level={3} style={{ margin: 0 }}>
            {isEdit ? 'Edit Product' : 'New Product'}
          </Title>
        </Space>
        <Text type="secondary">
          {isEdit ? 'Update product details' : 'Add a new product to the catalog'}
        </Text>
      </div>

      {loadError && (
        <Alert type="error" showIcon message={loadError} style={{ marginBottom: 16 }} />
      )}

      {hasVariants ? (
        <Alert
          type="info"
          showIcon
          message="This product uses variants"
          description="Each variant carries its own price, stock and (optional) heading below. The top-level price/stock are used only when there are no variants."
          style={{ marginBottom: 16 }}
        />
      ) : null}

      <div className="chart-card">
        <Form<FormValues>
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ isActive: true, gstRate: 18, currency: 'INR' }}
          requiredMark="optional"
        >
          <Row gutter={20}>
            <Col xs={24} md={16}>
              <Form.Item
                name="productName"
                label="Product name"
                rules={[{ required: true, message: 'Name is required' }]}
              >
                <Input placeholder="e.g. CRI Dhoom 1HP Pump" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="sku"
                label="SKU"
                rules={[{ required: !isDraftSaving, message: 'SKU is required' }]}
              >
                <Input placeholder="Unique stock code" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                name="productBrandId"
                label="Brand"
                rules={[{ required: !isDraftSaving, message: 'Select a brand' }]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  placeholder="Select brand"
                  options={brands.map((b) => ({ value: b.brandId, label: b.brandName }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="categoryId"
                label="Category"
                rules={[{ required: !isDraftSaving, message: 'Select a category' }]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  placeholder="Select category"
                  onChange={handleCategoryChange}
                  options={categories.map((c) => ({ value: c.categoryId, label: c.categoryName }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="discountPolicyId" label="Discount policy">
                <Select
                  allowClear
                  placeholder="None"
                  options={policies.map((p) => ({ value: p.policyId, label: p.policyId }))}
                />
              </Form.Item>
            </Col>

            <Col xs={12} md={6}>
              <Form.Item
                name="price"
                label="Price (₹)"
                rules={[{ required: !isDraftSaving && !hasVariants, message: 'Price is required' }]}
                tooltip={hasVariants ? 'Ignored while variants exist — variant prices apply' : undefined}
              >
                <InputNumber min={0} style={{ width: '100%' }} placeholder="0.00" disabled={hasVariants} />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item name="stockQuantity" label="Stock">
                <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item name="gstRate" label="GST rate (%)">
                <InputNumber min={0} max={28} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item name="unitOfMeasure" label="Unit">
                <Input placeholder="e.g. piece, metre" />
              </Form.Item>
            </Col>

            <Col xs={12} md={8}>
              <Form.Item name="hsn" label="HSN code">
                <Input placeholder="HSN" />
              </Form.Item>
            </Col>
            {isAdmin && (
              <Col xs={24} md={8}>
                <Form.Item
                  name="sellerId"
                  label="Seller"
                  tooltip="Assign which seller owns this product"
                  rules={[{ required: true, message: 'Select the seller who owns this product' }]}
                >
                  <Select
                    showSearch
                    allowClear
                    optionFilterProp="label"
                    placeholder="Select seller"
                    options={sellers.map((s) => ({
                      value: s.userId,
                      label: s.companyName ? `${s.companyName} (${s.userId})` : s.userId,
                    }))}
                  />
                </Form.Item>
              </Col>
            )}
            <Col xs={12} md={8}>
              <Form.Item name="isActive" label="Active" valuePropName="checked">
                <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item label="Product Images">
                <div style={{ background: '#F9FAFB', border: '1px dashed #D1D5DB', borderRadius: 8, padding: 16 }}>
                  <Upload {...uploadProps}>
                    <div>
                      <PlusOutlined />
                      <div style={{ marginTop: 8 }}>Upload Image</div>
                    </div>
                  </Upload>
                  
                  <div style={{ marginTop: 16, display: 'flex', gap: 8, maxWidth: 500 }}>
                    <Input
                      placeholder="Or paste an image URL..."
                      value={manualUrl}
                      onChange={(e) => setManualUrl(e.target.value)}
                      onPressEnter={(e) => {
                        e.preventDefault();
                        handleAddManualUrl();
                      }}
                    />
                    <Button onClick={handleAddManualUrl}>
                      Add URL
                    </Button>
                  </div>
                </div>
              </Form.Item>
              <Form.Item name="productImagesUrl" hidden>
                <Select mode="tags" />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item name="productDescription" label="Description">
                <TextArea rows={3} placeholder="Product description" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="warranty" label="Warranty">
                <Input placeholder="e.g. 1 year manufacturer warranty" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="supportDetails" label="Support details">
                <Input placeholder="Support contact / notes" />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ marginTop: 8 }}>Product Specifications (Attributes)</Divider>
          <Form.List name="technicalSpecs">
            {(fields, { add, remove }) => (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                {fields.map(({ key, name, ...restField }) => (
                  <Row gutter={12} key={key} style={{ display: 'flex', alignItems: 'center' }}>
                    <Col xs={11}>
                      <Form.Item
                        {...restField}
                        name={[name, 'key']}
                        rules={[{ required: true, message: 'Missing specification name' }]}
                      >
                        <Input placeholder="Spec key (e.g. Pump Type)" />
                      </Form.Item>
                    </Col>
                    <Col xs={11}>
                      <SpecValueField 
                        name={name} 
                        restField={restField} 
                        form={form} 
                        variantAttributes={variantAttributes}
                        getSpecValueControl={getSpecValueControl}
                      />
                    </Col>
                    <Col xs={2} style={{ textAlign: 'right', marginBottom: 24 }}>
                      <Button
                        type="text"
                        danger
                        icon={<MinusCircleOutlined />}
                        onClick={() => remove(name)}
                      />
                    </Col>
                  </Row>
                ))}
                <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} style={{ maxWidth: 220 }}>
                  Add specification
                </Button>
              </div>
            )}
          </Form.List>

          <Divider style={{ marginTop: 8 }}>Variants</Divider>
          <Form.Item
            name="variantAttributes"
            label="Variant attributes"
            tooltip="Attribute keys that distinguish variants (e.g. horsepower, size). Each variant gets an input per key."
          >
            <Select
              mode="tags"
              tokenSeparators={[',']}
              placeholder="Add attribute keys and press Enter (e.g. horsepower)"
              open={false}
              suffixIcon={null}
            />
          </Form.Item>

          {hasVariants && (
            <Form.List name="variants">
              {(fields, { add, remove }) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                  {fields.map(({ key, name, ...restField }) => (
                    <Card
                      key={key}
                      size="small"
                      style={{ background: '#FAFBFC' }}
                      title={`Variant ${name + 1}`}
                      extra={
                        <Button
                          type="text"
                          danger
                          icon={<MinusCircleOutlined />}
                          onClick={() => remove(name)}
                        />
                      }
                    >
                      <Row gutter={12}>
                        <Col xs={24} md={8}>
                          <Form.Item
                            {...restField}
                            name={[name, 'heading']}
                            label="Heading (optional)"
                            tooltip="Leave blank to auto-generate from the attribute values"
                          >
                            <Input placeholder="Auto from attributes if blank" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                          <Form.Item
                            {...restField}
                            name={[name, 'sku']}
                            label="SKU"
                            rules={[{ required: !isDraftSaving, message: 'SKU required' }]}
                          >
                            <Input placeholder="Variant SKU" />
                          </Form.Item>
                        </Col>
                        <Col xs={12} md={4}>
                          <Form.Item
                            {...restField}
                            name={[name, 'price']}
                            label="Price (₹)"
                            rules={[{ required: !isDraftSaving, message: 'Required' }]}
                          >
                            <InputNumber min={0} style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                        <Col xs={12} md={4}>
                          <Form.Item {...restField} name={[name, 'stockQuantity']} label="Qty">
                            <InputNumber min={0} style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>

                        {variantAttributes.map((attrKey) => (
                          <Col xs={12} md={6} key={attrKey}>
                            <Form.Item {...restField} name={[name, 'attributes', attrKey]} label={attrKey}>
                              {getSpecValueControl(attrKey)}
                            </Form.Item>
                          </Col>
                        ))}

                        <Col xs={12} md={4}>
                          <Form.Item
                            {...restField}
                            name={[name, 'gstRate']}
                            label="GST %"
                          >
                            <InputNumber min={0} max={28} style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                        <Col xs={12} md={4}>
                          <Form.Item
                            {...restField}
                            name={[name, 'isActive']}
                            label="Active"
                            valuePropName="checked"
                            initialValue={true}
                          >
                            <Switch size="small" />
                          </Form.Item>
                        </Col>
                      </Row>
                    </Card>
                  ))}
                  <Button type="dashed" onClick={() => add({ isActive: true })} icon={<PlusOutlined />} block>
                    Add variant
                  </Button>
                </div>
              )}
            </Form.List>
          )}

          <Space size="middle">
            <Button onClick={() => navigate('/products')}>Cancel</Button>
            <Button
              type="default"
              loading={saving || uploading}
              onClick={() => handleSaveWithActiveStatus(false)}
            >
              Save as draft
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving || uploading}
              onClick={() => handleSaveWithActiveStatus(true)}
            >
              {isEdit ? 'Publish changes' : 'Publish product'}
            </Button>
          </Space>
        </Form>
      </div>
    </div>
  );
}
