import { useState, useEffect } from 'react';
import { Form, Button, Select, Switch, Card, Typography, message } from 'antd';
import { PlusOutlined, MinusCircleOutlined, SaveOutlined } from '@ant-design/icons';
import { homepageConfigService } from '../../services/homepageConfigService';
import { carouselService } from '../../services/carouselService';
import { brandService } from '../../services/brandService';
import { categoryService } from '../../services/categoryService';
import { productService } from '../../services/productService';
import type { Carousel, HomepageConfig, Brand, Category, Product } from '../../types';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

export default function HomepageConfigManager() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [carousels, setCarousels] = useState<Carousel[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Helper to flatten category tree
  const flattenCategories = (cats: Category[]): Category[] => {
    let result: Category[] = [];
    cats.forEach(c => {
      result.push(c);
      if (c.subCategories && c.subCategories.length > 0) {
        result = result.concat(flattenCategories(c.subCategories));
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
          // Extract the IDs from the polymorphic cardDetails
          ids: ec.cardDetails?.map((d: any) => d.id || d.brandId || d.categoryId || d.productId || '') || [],
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
          enabled: ec.enabled,
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

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }} className="animate-fade-in">
      <div className="page-header-row">
        <div>
          <Title level={3} style={{ margin: 0 }}>Homepage Configuration</Title>
          <Text type="secondary">Manage the layout and content of the buyer storefront</Text>
        </div>
        <Button className="page-header-action" type="primary" icon={<SaveOutlined />} loading={saving} onClick={() => form.submit()}>
          Save Changes
        </Button>
      </div>

      <Form form={form} layout="vertical" onFinish={handleSave} disabled={loading}>
        <Card title="Active Carousels" style={{ marginBottom: 24 }}>
          <Paragraph type="secondary">
            Select the promotional banners that should be displayed at the top of the homepage.
          </Paragraph>
          <Form.Item name="carouselIds" label="Select Carousels">
            <Select
              mode="multiple"
              placeholder="Select carousels..."
              style={{ width: '100%' }}
              options={carousels.map(c => ({
                label: c.title,
                value: c.carouselId,
              }))}
            />
          </Form.Item>
        </Card>

        <Card title="Explore Cards (Sections)" style={{ marginBottom: 24 }}>
          <Paragraph type="secondary">
            Configure dynamic homepage sections like Featured Brands, Products, or Categories. 
          </Paragraph>
          
          <Form.List name="exploreCards">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Card size="small" key={key} style={{ marginBottom: 16, background: '#fafafa' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                        <Form.Item
                          {...restField}
                          name={[name, 'cardType']}
                          label="Section Type"
                          rules={[{ required: true, message: 'Required' }]}
                          style={{ minWidth: 180, flex: '0 0 auto', marginBottom: 0 }}
                        >
                          <Select placeholder="Select type" onChange={() => form.setFieldValue(['exploreCards', name, 'ids'], [])}>
                            <Option value="FEATURED_BRANDS">Featured Brands</Option>
                            <Option value="FEATURED_VERTICALS">Featured Categories</Option>
                            <Option value="FEATURED_PRODUCTS">Featured Products</Option>
                            <Option value="FEATURED_OFFERS">Featured Offers</Option>
                          </Select>
                        </Form.Item>

                        <Form.Item
                          {...restField}
                          name={[name, 'enabled']}
                          label="Active"
                          valuePropName="checked"
                          initialValue={true}
                          style={{ marginBottom: 0 }}
                        >
                          <Switch />
                        </Form.Item>

                        <Button 
                          type="text" 
                          danger 
                          icon={<MinusCircleOutlined />} 
                          onClick={() => remove(name)} 
                          style={{ marginTop: 30 }} 
                        />
                      </div>

                      <Form.Item
                        noStyle
                        shouldUpdate={(prevValues, currentValues) =>
                          prevValues.exploreCards?.[name]?.cardType !== currentValues.exploreCards?.[name]?.cardType
                        }
                      >
                        {() => {
                          const cardType = form.getFieldValue(['exploreCards', name, 'cardType']);
                          
                          let options: { label: string; value: string }[] = [];
                          let placeholder = "Select items...";

                          if (cardType === 'FEATURED_BRANDS') {
                            options = brands.map(b => ({ label: b.brandName, value: b.brandId! }));
                            placeholder = "Select brands...";
                          } else if (cardType === 'FEATURED_VERTICALS') {
                            options = categories.map(c => ({ label: c.categoryName, value: c.categoryId! }));
                            placeholder = "Select categories...";
                          } else if (cardType === 'FEATURED_PRODUCTS' || cardType === 'FEATURED_OFFERS') {
                            options = products.map(p => ({ label: p.productName, value: p.productId }));
                            placeholder = "Select products...";
                          }

                          return (
                            <Form.Item
                              {...restField}
                              name={[name, 'ids']}
                              label="Select Entities"
                              style={{ marginBottom: 0 }}
                              rules={[{ required: true, message: 'Please select at least one item' }]}
                            >
                              <Select 
                                mode="multiple" 
                                placeholder={placeholder} 
                                options={options}
                                style={{ width: '100%' }}
                                showSearch
                                optionFilterProp="label"
                              />
                            </Form.Item>
                          );
                        }}
                      </Form.Item>
                    </div>
                  </Card>
                ))}
                
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                  Add Homepage Section
                </Button>
              </>
            )}
          </Form.List>
        </Card>
      </Form>
    </div>
  );
}
