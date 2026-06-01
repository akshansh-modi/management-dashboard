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
import type { Product, Brand, Category, DiscountPolicy, AdminUser } from '../../types';

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
                rules={[{ required: true, message: 'SKU is required' }]}
              >
                <Input placeholder="Unique stock code" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                name="productBrandId"
                label="Brand"
                rules={[{ required: true, message: 'Select a brand' }]}
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
                rules={[{ required: true, message: 'Select a category' }]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  placeholder="Select category"
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
                rules={[{ required: !hasVariants, message: 'Price is required' }]}
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
              <Form.Item name="productImagesUrl" label="Image URLs">
                <Select
                  mode="tags"
                  tokenSeparators={[',']}
                  placeholder="Paste an image URL and press Enter"
                  open={false}
                  suffixIcon={null}
                />
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
                        noStyle
                      >
                        <Input placeholder="Spec key (e.g. Pump Type)" />
                      </Form.Item>
                    </Col>
                    <Col xs={11}>
                      <Form.Item
                        {...restField}
                        name={[name, 'value']}
                        rules={[{ required: true, message: 'Missing specification value' }]}
                        noStyle
                      >
                        <Input placeholder="Spec value (e.g. Centrifugal)" />
                      </Form.Item>
                    </Col>
                    <Col xs={2} style={{ textAlign: 'right' }}>
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
                            rules={[{ required: true, message: 'SKU required' }]}
                          >
                            <Input placeholder="Variant SKU" />
                          </Form.Item>
                        </Col>
                        <Col xs={12} md={4}>
                          <Form.Item
                            {...restField}
                            name={[name, 'price']}
                            label="Price (₹)"
                            rules={[{ required: true, message: 'Required' }]}
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
                              <Input placeholder={attrKey} />
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

          <Space>
            <Button onClick={() => navigate('/products')}>Cancel</Button>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
              {isEdit ? 'Save changes' : 'Create product'}
            </Button>
          </Space>
        </Form>
      </div>
    </div>
  );
}
