import { useState, useEffect } from 'react';
import { Form, Button, Select, Switch, Card, Typography, message, Space, Empty, Alert, Badge } from 'antd';
import { 
  PlusOutlined, 
  SaveOutlined, 
  ArrowUpOutlined, 
  ArrowDownOutlined, 
  DeleteOutlined, 
  InfoCircleOutlined,
  PictureOutlined,
  AppstoreOutlined,
  TagOutlined,
  ShopOutlined
} from '@ant-design/icons';
import { homepageConfigService } from '../../services/homepageConfigService';
import { carouselService } from '../../services/carouselService';
import { brandService } from '../../services/brandService';
import { categoryService } from '../../services/categoryService';
import { productService } from '../../services/productService';
import type { Carousel, HomepageConfig, Brand, Category, Product } from '../../types';

const { Title, Text, Paragraph } = Typography;

export default function HomepageConfigManager() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [carousels, setCarousels] = useState<Carousel[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<(Category & { displayName?: string })[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Helper to flatten category tree and construct hierarchical names
  const flattenCategories = (cats: Category[], parentName = ''): any[] => {
    let result: any[] = [];
    cats.forEach(c => {
      const displayName = parentName ? `${parentName} › ${c.categoryName}` : c.categoryName;
      result.push({
        ...c,
        displayName
      });
      if (c.subCategories && c.subCategories.length > 0) {
        result = result.concat(flattenCategories(c.subCategories, displayName));
      }
    });
    return result;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [configData, carouselsData, brandsData, categoriesTree, productsPage] = await Promise.all([
        homepageConfigService.get().catch(() => ({})), // Ignore error if no config exists
        carouselService.getAll(),
        brandService.getAll(),
        categoryService.getTree(),
        productService.listAll(0, 1000), // Fetch up to 1000 products for the dropdown
      ]);

      setCarousels(carouselsData);
      setBrands(brandsData);
      setCategories(flattenCategories(categoriesTree));
      setProducts(productsPage.content || []);
      
      const formattedConfig = {
        carouselIds: configData.carousels?.map((c: Carousel) => c.carouselId) || [],
        exploreCards: configData.exploreCards?.map((ec: any) => ({
          ...ec,
          // Map backend's isEnabled property to form's enabled property
          enabled: ec.isEnabled !== undefined ? ec.isEnabled : ec.enabled,
          // Extract the IDs from the polymorphic cardDetails, supporting all card types (verticalId, offerId)
          ids: ec.cardDetails?.map((d: any) => d.id || d.brandId || d.categoryId || d.productId || d.verticalId || d.offerId || '') || [],
        })) || [],
      };

      form.setFieldsValue(formattedConfig);
    } catch (err) {
      message.error('Failed to load configuration dependencies.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (values: any) => {
    setSaving(true);
    try {
      const payload: HomepageConfig = {
        carouselIds: values.carouselIds || [],
        exploreCards: values.exploreCards?.map((ec: any) => ({
          cardType: ec.cardType,
          enabled: ec.enabled !== undefined ? ec.enabled : true,
          ids: ec.ids || [],
        })) || [],
      };

      await homepageConfigService.save(payload);
      message.success('Homepage configuration saved successfully!');
      fetchData();
    } catch (err) {
      message.error('Failed to save homepage configuration.');
    } finally {
      setSaving(false);
    }
  };

  // Helper to get card type styling properties
  const getCardStyle = (cardType: string) => {
    switch (cardType) {
      case 'FEATURED_BRANDS':
        return {
          borderLeft: '4px solid #2f54eb',
          icon: <ShopOutlined style={{ color: '#2f54eb' }} />,
          bg: '#f0f5ff',
          label: 'Featured Brands'
        };
      case 'FEATURED_VERTICALS':
        return {
          borderLeft: '4px solid #722ed1',
          icon: <AppstoreOutlined style={{ color: '#722ed1' }} />,
          bg: '#f9f0ff',
          label: 'Featured Categories'
        };
      case 'FEATURED_PRODUCTS':
        return {
          borderLeft: '4px solid #52c41a',
          icon: <PictureOutlined style={{ color: '#52c41a' }} />,
          bg: '#f6ffed',
          label: 'Featured Products'
        };
      case 'FEATURED_OFFERS':
        return {
          borderLeft: '4px solid #fa8c16',
          icon: <TagOutlined style={{ color: '#fa8c16' }} />,
          bg: '#fff7e6',
          label: 'Special Offers'
        };
      default:
        return {
          borderLeft: '4px solid #d9d9d9',
          icon: <InfoCircleOutlined style={{ color: '#8c8c8c' }} />,
          bg: '#fafafa',
          label: 'Dynamic Section'
        };
    }
  };

  return (
    <div style={{ padding: '24px 16px', maxWidth: 1000, margin: '0 auto' }} className="animate-fade-in">
      <div className="page-header-row" style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: 16, marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 700 }}>Storefront Layout Manager</Title>
          <Text type="secondary">Tailor the promotional banners, partners, categories and product cards on the customer homepage.</Text>
        </div>
        <Button 
          type="primary" 
          icon={<SaveOutlined />} 
          loading={saving} 
          onClick={() => form.submit()}
          style={{ height: 40, padding: '0 20px', borderRadius: 8, fontWeight: 600, boxShadow: '0 4px 12px rgba(47, 84, 235, 0.15)' }}
        >
          Save Changes
        </Button>
      </div>

      <Alert
        message="Live Synchronization"
        description="Any saved layouts, promotional banners, and active categories are immediately synced and live on the Sanitary-Direct buyer application."
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        style={{ marginBottom: 24, borderRadius: 8 }}
      />

      <Form form={form} layout="vertical" onFinish={handleSave} disabled={loading}>
        <Card 
          title={<Space><PictureOutlined /> <span>Active Banner Carousels</span></Space>} 
          style={{ marginBottom: 24, borderRadius: 12, boxShadow: '0 4px 18px rgba(0,0,0,0.02)', border: '1px solid #f0f0f0' }}
          styles={{ body: { padding: 24 } }}
        >
          <Paragraph type="secondary" style={{ marginBottom: 16 }}>
            Select the promotional slideshow banners that should be displayed at the very top of the homepage catalog.
          </Paragraph>
          <Form.Item name="carouselIds" noStyle>
            <Select
              mode="multiple"
              placeholder="Select active carousels..."
              style={{ width: '100%' }}
              allowClear
              optionFilterProp="label"
              optionRender={(option: any) => option.data.desc || option.data.label}
              options={carousels.map(c => ({
                label: c.title,
                value: c.carouselId,
                desc: (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0' }}>
                    {c.imageUrl ? (
                      <img 
                        src={c.imageUrl} 
                        alt={c.title} 
                        style={{ width: 56, height: 32, objectFit: 'cover', borderRadius: 4, border: '1px solid #f0f0f0' }} 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div style={{ width: 56, height: 32, background: '#f5f5f5', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <PictureOutlined style={{ color: '#bfbfbf' }} />
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: '#1f1f1f' }}>{c.title}</span>
                      <span style={{ fontSize: 11, color: '#8c8c8c' }}>{c.tagline || 'Promotional Campaign'}</span>
                    </div>
                  </div>
                )
              }))}
            />
          </Form.Item>
        </Card>

        <Card 
          title={<Space><AppstoreOutlined /> <span>Homepage Sections Grid</span></Space>}
          style={{ borderRadius: 12, boxShadow: '0 4px 18px rgba(0,0,0,0.02)', border: '1px solid #f0f0f0' }}
          styles={{ body: { padding: 24 } }}
        >
          <Paragraph type="secondary" style={{ marginBottom: 20 }}>
            Configure and order your landing segments such as featured brands, product selections, or category groups. Drag/move items to adjust the vertical order.
          </Paragraph>
          
          <Form.List name="exploreCards">
            {(fields, { add, remove, move }) => (
              <>
                {fields.length === 0 ? (
                  <Empty 
                    description="No homepage sections added yet. Click the button below to add your first segment."
                    style={{ padding: '24px 0', marginBottom: 20 }}
                  />
                ) : (
                  fields.map(({ key, name, ...restField }, index) => {
                    const cardType = form.getFieldValue(['exploreCards', name, 'cardType']);
                    const styleConfig = getCardStyle(cardType);

                    return (
                      <Card 
                        size="small" 
                        key={key} 
                        style={{ 
                          marginBottom: 16, 
                          borderRadius: 8, 
                          border: '1px solid #f0f0f0',
                          borderLeft: styleConfig.borderLeft,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.01)',
                          transition: 'all 0.3s ease'
                        }}
                        styles={{ body: { padding: 16 } }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                          {/* Row 1: Section Header with Controls */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                            <Space size="middle">
                              <span style={{ fontSize: 18, display: 'flex', alignItems: 'center' }}>
                                {styleConfig.icon}
                              </span>
                              <Badge 
                                color={
                                  cardType === 'FEATURED_BRANDS' ? '#2f54eb' :
                                  cardType === 'FEATURED_VERTICALS' ? '#722ed1' :
                                  cardType === 'FEATURED_PRODUCTS' ? '#52c41a' :
                                  cardType === 'FEATURED_OFFERS' ? '#fa8c16' : '#bfbfbf'
                                } 
                                text={<strong style={{ fontSize: 14 }}>Section #{index + 1}: {styleConfig.label}</strong>}
                              />
                            </Space>

                            {/* Move controls and Delete */}
                            <Space size="small">
                              <Button 
                                type="text"
                                size="small"
                                icon={<ArrowUpOutlined />} 
                                disabled={index === 0} 
                                onClick={() => move(index, index - 1)}
                                title="Move Up"
                              />
                              <Button 
                                type="text"
                                size="small"
                                icon={<ArrowDownOutlined />} 
                                disabled={index === fields.length - 1} 
                                onClick={() => move(index, index + 1)}
                                title="Move Down"
                              />
                              <Button 
                                type="text" 
                                size="small"
                                danger 
                                icon={<DeleteOutlined />} 
                                onClick={() => remove(name)}
                                title="Remove Section"
                                style={{ marginLeft: 8 }}
                              />
                            </Space>
                          </div>

                          {/* Row 2: Fields Input Container */}
                          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', width: '100%' }}>
                            <div style={{ flex: '1 1 200px' }}>
                              <Form.Item
                                {...restField}
                                name={[name, 'cardType']}
                                label={<span style={{ fontWeight: 600, fontSize: 12 }}>Section Target Category</span>}
                                rules={[{ required: true, message: 'Select segment type' }]}
                                style={{ marginBottom: 0 }}
                              >
                                <Select 
                                  placeholder="Select type" 
                                  onChange={() => form.setFieldValue(['exploreCards', name, 'ids'], [])}
                                  style={{ borderRadius: 6 }}
                                >
                                  <Select.Option value="FEATURED_BRANDS">Strategic Partners (Brands)</Select.Option>
                                  <Select.Option value="FEATURED_VERTICALS">Featured Categories (Verticals)</Select.Option>
                                  <Select.Option value="FEATURED_PRODUCTS">Featured Components (Products)</Select.Option>
                                  <Select.Option value="FEATURED_OFFERS">Special Offers (Product Banners)</Select.Option>
                                </Select>
                              </Form.Item>
                            </div>

                            <div style={{ flex: '0 0 auto' }}>
                              <Form.Item
                                {...restField}
                                name={[name, 'enabled']}
                                label={<span style={{ fontWeight: 600, fontSize: 12 }}>Active Status</span>}
                                valuePropName="checked"
                                initialValue={true}
                                style={{ marginBottom: 0, textAlign: 'center' }}
                              >
                                <Switch checkedChildren="Active" unCheckedChildren="Hidden" />
                              </Form.Item>
                            </div>
                          </div>

                          {/* Row 3: Multiselect dropdown populated based on type */}
                          <Form.Item
                            noStyle
                            shouldUpdate={(prevValues, currentValues) =>
                              prevValues.exploreCards?.[name]?.cardType !== currentValues.exploreCards?.[name]?.cardType
                            }
                          >
                            {() => {
                              const cardType = form.getFieldValue(['exploreCards', name, 'cardType']);
                              
                              let options: { label: string; value: string; desc?: any }[] = [];
                              let placeholder = "Please select target cards first...";

                              if (cardType === 'FEATURED_BRANDS') {
                                options = brands.map(b => ({
                                  label: b.brandName,
                                  value: b.brandId!,
                                  desc: (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
                                      {b.brandLogoUrl ? (
                                        <img 
                                          src={b.brandLogoUrl} 
                                          alt={b.brandName} 
                                          style={{ width: 24, height: 24, objectFit: 'contain', background: '#ffffff', borderRadius: 4, border: '1px solid #f0f0f0', padding: 2 }} 
                                          referrerPolicy="no-referrer"
                                        />
                                      ) : (
                                        <div style={{ width: 24, height: 24, background: '#e6f7ff', color: '#1890ff', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, fontSize: 10, fontWeight: 'bold' }}>
                                          {b.brandName.slice(0, 2).toUpperCase()}
                                        </div>
                                      )}
                                      <span style={{ fontSize: 13, color: '#1a1a1a' }}>{b.brandName}</span>
                                    </div>
                                  )
                                }));
                                placeholder = "Select brands to feature...";
                              } else if (cardType === 'FEATURED_VERTICALS') {
                                options = categories.map(c => ({
                                  label: c.displayName || c.categoryName,
                                  value: c.categoryId!,
                                  desc: (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
                                      {c.categoryImageUrl ? (
                                        <img 
                                          src={c.categoryImageUrl} 
                                          alt={c.categoryName} 
                                          style={{ width: 24, height: 24, objectFit: 'cover', borderRadius: 4, border: '1px solid #f0f0f0' }} 
                                          referrerPolicy="no-referrer"
                                        />
                                      ) : (
                                        <div style={{ width: 24, height: 24, background: '#f9f0ff', color: '#722ed1', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, fontSize: 10, fontWeight: 'bold' }}>
                                          {c.categoryName.slice(0, 2).toUpperCase()}
                                        </div>
                                      )}
                                      <span style={{ fontSize: 13, color: '#1a1a1a' }}>{c.displayName || c.categoryName}</span>
                                    </div>
                                  )
                                }));
                                placeholder = "Select categories to display...";
                              } else if (cardType === 'FEATURED_PRODUCTS' || cardType === 'FEATURED_OFFERS') {
                                options = products.map(p => ({
                                  label: p.productName,
                                  value: p.productId,
                                  desc: (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0' }}>
                                      {p.productImagesUrl?.[0] ? (
                                        <img 
                                          src={p.productImagesUrl[0]} 
                                          alt={p.productName} 
                                          style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4, border: '1px solid #f0f0f0' }} 
                                          referrerPolicy="no-referrer"
                                        />
                                      ) : (
                                        <div style={{ width: 32, height: 32, background: '#f6ffed', color: '#52c41a', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, fontSize: 10, fontWeight: 'bold' }}>
                                          {p.productName.slice(0, 2).toUpperCase()}
                                        </div>
                                      )}
                                      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
                                        <span style={{ fontWeight: 600, fontSize: 13, color: '#1a1a1a' }}>{p.productName}</span>
                                        <span style={{ fontSize: 11, color: '#8c8c8c' }}>SKU: {p.sku} | Price: ₹{p.price}</span>
                                      </div>
                                    </div>
                                  )
                                }));
                                placeholder = cardType === 'FEATURED_PRODUCTS' ? "Select products to showcase..." : "Select special offer products...";
                              }

                              return (
                                <Form.Item
                                  {...restField}
                                  name={[name, 'ids']}
                                  label={<span style={{ fontWeight: 600, fontSize: 12 }}>Configure Items List</span>}
                                  style={{ marginBottom: 0 }}
                                  rules={[{ required: true, message: 'Please select at least one item' }]}
                                >
                                  <Select 
                                    mode="multiple" 
                                    placeholder={placeholder} 
                                    options={options}
                                    style={{ width: '100%', borderRadius: 6 }}
                                    showSearch
                                    optionFilterProp="label"
                                    optionRender={(option: any) => option.data.desc || option.data.label}
                                  />
                                </Form.Item>
                              );
                            }}
                          </Form.Item>
                        </div>
                      </Card>
                    );
                  })
                )}
                
                <Button 
                  type="dashed" 
                  onClick={() => add()} 
                  block 
                  icon={<PlusOutlined />}
                  style={{ height: 44, borderRadius: 8, border: '2px dashed #bfbfbf', fontWeight: 600, color: '#595959' }}
                >
                  Add Homepage Section Grid
                </Button>
              </>
            )}
          </Form.List>
        </Card>
      </Form>
    </div>
  );
}
